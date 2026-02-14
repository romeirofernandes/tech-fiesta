const ProductionRecord = require('../models/ProductionRecord');
const Expense = require('../models/Expense');
const SaleTransaction = require('../models/SaleTransaction');
const Animal = require('../models/Animal');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * GET /api/bi/farm-summary?farmId=&from=&to=
 * KPIs: animals on farm, production totals, revenue, cost, profit
 */
exports.farmSummary = async (req, res) => {
  try {
    const { farmId, from, to } = req.query;
    if (!farmId) return res.status(400).json({ message: 'farmId required' });

    const farmOid = new (require('mongoose').Types.ObjectId)(farmId);

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const dateMatch = Object.keys(dateFilter).length ? { date: dateFilter } : {};

    // Animal count + breakdown by species
    const [animalCount, animalsBySpecies, animals] = await Promise.all([
      Animal.countDocuments({ farmId: farmOid }),
      Animal.aggregate([
        { $match: { farmId: farmOid } },
        { $group: { _id: '$species', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Animal.find({ farmId: farmOid }).select('name species breed gender age ageUnit rfid').lean(),
    ]);

    // Production totals by productType
    const production = await ProductionRecord.aggregate([
      { $match: { farmId: farmOid, ...dateMatch } },
      { $group: { _id: '$productType', totalQuantity: { $sum: '$quantity' }, unit: { $first: '$unit' }, count: { $sum: 1 } } },
      { $sort: { totalQuantity: -1 } }
    ]);

    // Revenue totals
    const sales = await SaleTransaction.aggregate([
      { $match: { farmId: farmOid, ...dateMatch } },
      { $group: { _id: '$productType', totalRevenue: { $sum: '$totalAmount' }, totalQuantitySold: { $sum: '$quantity' }, count: { $sum: 1 } } },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Expense totals
    const expenses = await Expense.aggregate([
      { $match: { farmId: farmOid, ...dateMatch } },
      { $group: { _id: '$category', totalCost: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { totalCost: -1 } }
    ]);

    const totalRevenue = sales.reduce((s, r) => s + r.totalRevenue, 0);
    const totalCost = expenses.reduce((s, r) => s + r.totalCost, 0);
    const profit = totalRevenue - totalCost;

    res.json({
      farmId,
      from: from || null,
      to: to || null,
      animalCount,
      animalsBySpecies,
      animals,
      production,
      sales,
      expenses,
      totals: { totalRevenue, totalCost, profit, currency: 'INR' },
    });
  } catch (error) {
    console.error('Farm summary error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * GET /api/bi/animal-performance?farmId=&from=&to=&productType=
 * Rank animals by production; flag underperformers (<80% of farm median for same species+productType).
 */
exports.animalPerformance = async (req, res) => {
  try {
    const { farmId, from, to, productType } = req.query;
    if (!farmId) return res.status(400).json({ message: 'farmId required' });

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const dateMatch = Object.keys(dateFilter).length ? { date: dateFilter } : {};

    const matchStage = { farmId: new (require('mongoose').Types.ObjectId)(farmId), ...dateMatch };
    if (productType) matchStage.productType = productType;

    // Aggregate per animal
    const animalProduction = await ProductionRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { animalId: '$animalId', productType: '$productType' },
          totalQuantity: { $sum: '$quantity' },
          avgDaily: { $avg: '$quantity' },
          unit: { $first: '$unit' },
          count: { $sum: 1 },
        }
      },
      {
        $lookup: {
          from: 'animals',
          localField: '_id.animalId',
          foreignField: '_id',
          as: 'animal'
        }
      },
      { $unwind: '$animal' },
      {
        $project: {
          animalId: '$_id.animalId',
          productType: '$_id.productType',
          totalQuantity: 1,
          avgDaily: 1,
          unit: 1,
          count: 1,
          animalName: '$animal.name',
          species: '$animal.species',
          rfid: '$animal.rfid',
        }
      },
      { $sort: { totalQuantity: -1 } }
    ]);

    // Compute median per species+productType, flag underperformers
    const groups = {};
    for (const a of animalProduction) {
      const key = `${a.species}__${a.productType}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    }

    const THRESHOLD = 0.8; // 80% of median
    const results = animalProduction.map(a => {
      const key = `${a.species}__${a.productType}`;
      const sorted = [...groups[key]].sort((x, y) => x.totalQuantity - y.totalQuantity);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 !== 0 ? sorted[mid].totalQuantity : (sorted[mid - 1].totalQuantity + sorted[mid].totalQuantity) / 2;
      const ratio = median > 0 ? a.totalQuantity / median : 1;
      return {
        ...a,
        median,
        ratio: Math.round(ratio * 100) / 100,
        underperforming: ratio < THRESHOLD,
      };
    });

    res.json({ farmId, from: from || null, to: to || null, productType: productType || 'all', animals: results });
  } catch (error) {
    console.error('Animal performance error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * GET /api/bi/timeseries?farmId=&metric=production|revenue|cost&granularity=day|week|month&productType=
 * Returns chart-ready arrays.
 */
exports.timeseries = async (req, res) => {
  try {
    const { farmId, metric, granularity = 'day', productType } = req.query;
    if (!farmId || !metric) return res.status(400).json({ message: 'farmId and metric required' });

    const farmOid = new (require('mongoose').Types.ObjectId)(farmId);

    // Date grouping expression
    const dateGroup = granularity === 'month'
      ? { year: { $year: '$date' }, month: { $month: '$date' } }
      : granularity === 'week'
        ? { year: { $isoWeekYear: '$date' }, week: { $isoWeek: '$date' } }
        : { year: { $year: '$date' }, month: { $month: '$date' }, day: { $dayOfMonth: '$date' } };

    let pipeline;

    if (metric === 'production') {
      const match = { farmId: farmOid };
      if (productType) match.productType = productType;
      pipeline = [
        { $match: match },
        { $group: { _id: dateGroup, value: { $sum: '$quantity' } } },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
      ];
      const data = await ProductionRecord.aggregate(pipeline);
      return res.json({ metric, granularity, data: formatTimeseries(data, granularity) });
    }

    if (metric === 'revenue') {
      const match = { farmId: farmOid };
      if (productType) match.productType = productType;
      pipeline = [
        { $match: match },
        { $group: { _id: dateGroup, value: { $sum: '$totalAmount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
      ];
      const data = await SaleTransaction.aggregate(pipeline);
      return res.json({ metric, granularity, data: formatTimeseries(data, granularity) });
    }

    if (metric === 'cost') {
      pipeline = [
        { $match: { farmId: farmOid } },
        { $group: { _id: dateGroup, value: { $sum: '$amount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
      ];
      const data = await Expense.aggregate(pipeline);
      return res.json({ metric, granularity, data: formatTimeseries(data, granularity) });
    }

    res.status(400).json({ message: 'Invalid metric. Use production|revenue|cost' });
  } catch (error) {
    console.error('Timeseries error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

function formatTimeseries(data, granularity) {
  return data.map(d => {
    let label;
    if (granularity === 'month') {
      label = `${d._id.year}-${String(d._id.month).padStart(2, '0')}`;
    } else if (granularity === 'week') {
      label = `${d._id.year}-W${String(d._id.week).padStart(2, '0')}`;
    } else {
      label = `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`;
    }
    return { label, value: Math.round(d.value * 100) / 100 };
  });
}

/**
 * GET /api/bi/insights?farmId=&from=&to=
 * Uses Groq LLM to generate actionable insights from BI data.
 */
exports.insights = async (req, res) => {
  try {
    const { farmId, from, to } = req.query;
    if (!farmId) return res.status(400).json({ message: 'farmId required' });

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const dateMatch = Object.keys(dateFilter).length ? { date: dateFilter } : {};
    const farmOid = new (require('mongoose').Types.ObjectId)(farmId);

    // Gather summary data
    const [prodData, salesData, expData, animalCount] = await Promise.all([
      ProductionRecord.aggregate([
        { $match: { farmId: farmOid, ...dateMatch } },
        { $group: { _id: '$productType', total: { $sum: '$quantity' }, unit: { $first: '$unit' } } }
      ]),
      SaleTransaction.aggregate([
        { $match: { farmId: farmOid, ...dateMatch } },
        { $group: { _id: '$productType', revenue: { $sum: '$totalAmount' }, qty: { $sum: '$quantity' } } }
      ]),
      Expense.aggregate([
        { $match: { farmId: farmOid, ...dateMatch } },
        { $group: { _id: '$category', cost: { $sum: '$amount' } } }
      ]),
      Animal.countDocuments({ farmId: farmOid }),
    ]);

    const totalRevenue = salesData.reduce((s, r) => s + r.revenue, 0);
    const totalCost = expData.reduce((s, r) => s + r.cost, 0);

    const summaryText = `
Farm BI Data (INR):
- Animals: ${animalCount}
- Production: ${JSON.stringify(prodData)}
- Sales (revenue): ${JSON.stringify(salesData)}, Total Revenue: ₹${totalRevenue}
- Expenses: ${JSON.stringify(expData)}, Total Cost: ₹${totalCost}
- Profit: ₹${totalRevenue - totalCost}
Period: ${from || 'all-time'} to ${to || 'now'}
    `.trim();

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an agricultural business analyst. Given farm financial and production data in INR, provide 3-5 concise, actionable insights. Focus on profitability, efficiency, and cost optimization. Format as a JSON array of objects with "title" and "detail" fields. Return ONLY valid JSON.'
        },
        { role: 'user', content: summaryText }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
      max_tokens: 1000,
    });

    let text = completion.choices[0].message.content.trim();
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : [{ title: 'Analysis', detail: text }];

    res.json({ farmId, insights });
  } catch (error) {
    console.error('BI insights error:', error);
    res.status(500).json({ message: 'Failed to generate insights' });
  }
};
