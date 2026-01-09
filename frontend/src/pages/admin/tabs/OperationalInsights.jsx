import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin, Users, Search, ArrowUpDown, Filter, Activity } from "lucide-react";

export default function OperationalInsights() {
  const [data, setData] = useState({
    farms: [],
    animals: [],
    loading: true,
    error: null
  });
  
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHealth, setFilterHealth] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const baseURL = 'http://localhost:8000';
      
      const [farmsRes, animalsRes] = await Promise.all([
        fetch(`${baseURL}/api/farms`).then(r => r.json()),
        fetch(`${baseURL}/api/animals`).then(r => r.json())
      ]);

      setData({
        farms: farmsRes || [],
        animals: animalsRes || [],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      setData(prev => ({ 
        ...prev, 
        loading: false,
        error: error.message 
      }));
    }
  };

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-600">Loading data...</span>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">Error: {data.error}</p>
        <button 
          onClick={fetchData}
          className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const farmMetrics = data.farms.map(farm => {
    const farmAnimals = data.animals.filter(a => a.farmId === farm._id);
    const speciesBreakdown = farmAnimals.reduce((acc, animal) => {
      acc[animal.species] = (acc[animal.species] || 0) + 1;
      return acc;
    }, {});
    
    const healthyCount = farmAnimals.filter(a => a.healthStatus === 'healthy').length;

    return {
      ...farm,
      animalCount: farmAnimals.length,
      speciesBreakdown,
      healthRate: farmAnimals.length > 0 ? Math.round((healthyCount / farmAnimals.length) * 100) : 0,
    };
  });

  const filteredFarms = farmMetrics
    .filter(farm => {
      const matchesSearch = farm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           farm.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesHealth = filterHealth === 'all' || 
                           (filterHealth === 'good' && farm.healthRate >= 80) ||
                           (filterHealth === 'attention' && farm.healthRate < 80);
      return matchesSearch && matchesHealth;
    })
    .sort((a, b) => {
      let aVal, bVal;
      switch(sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'animals':
          aVal = a.animalCount;
          bVal = b.animalCount;
          break;
        case 'health':
          aVal = a.healthRate;
          bVal = b.healthRate;
          break;
        case 'species':
          aVal = Object.keys(a.speciesBreakdown).length;
          bVal = Object.keys(b.speciesBreakdown).length;
          break;
        default:
          return 0;
      }
      
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  const ageDistribution = (() => {
    const distribution = {
      'Young (< 1 year)': 0,
      'Adult (1-5 years)': 0,
      'Mature (5+ years)': 0
    };

    data.animals.forEach(animal => {
      const ageInYears = animal.ageUnit === 'months' ? animal.age / 12 : animal.age;
      if (ageInYears < 1) distribution['Young (< 1 year)']++;
      else if (ageInYears <= 5) distribution['Adult (1-5 years)']++;
      else distribution['Mature (5+ years)']++;
    });

    return distribution;
  })();

  const speciesData = Object.entries(
    data.animals.reduce((acc, animal) => {
      acc[animal.species] = (acc[animal.species] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Compact Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-black rounded-lg p-4 shadow-sm border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.farms.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Farms</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-black rounded-lg p-4 shadow-sm border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.animals.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Animals</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-black rounded-lg p-4 shadow-sm border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.farms.length > 0 ? Math.round(data.animals.length / data.farms.length) : 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Avg/Farm</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-black rounded-lg p-4 shadow-sm border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{speciesData.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Species</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-black rounded-lg p-4 shadow-sm border border-gray-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search farms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterHealth}
            onChange={(e) => setFilterHealth(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Health</option>
            <option value="good">≥80% Healthy</option>
            <option value="attention">&lt;80% Healthy</option>
          </select>

          <button
            onClick={() => toggleSort('animals')}
            className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
              sortBy === 'animals' 
                ? 'bg-black text-white' 
                : 'bg-white dark:bg-black border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-black'
            }`}
          >
            Animals {sortBy === 'animals' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>

          <button
            onClick={() => toggleSort('health')}
            className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
              sortBy === 'health' 
                ? 'bg-black text-white' 
                : 'bg-white dark:bg-black border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-black'
            }`}
          >
            Health {sortBy === 'health' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>

          <button
            onClick={() => toggleSort('species')}
            className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
              sortBy === 'species' 
                ? 'bg-black text-white' 
                : 'bg-white dark:bg-black border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-black'
            }`}
          >
            Diversity {sortBy === 'species' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Compact Table */}
      <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-black border-b border-gray-200 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Farm Operations ({filteredFarms.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-black border-b border-gray-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Farm</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Animals</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Species</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Health</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredFarms.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No farms found
                  </td>
                </tr>
              ) : (
                filteredFarms.map((farm, idx) => (
                  <tr key={farm._id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-black' : 'bg-gray-50/50 dark:bg-black/50'}`}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{farm.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{farm.location}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{farm.animalCount}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{Object.keys(farm.speciesBreakdown).length}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        farm.healthRate >= 80 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                      }`}>
                        {farm.healthRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(farm.speciesBreakdown)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([species, count]) => (
                            <span key={species} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              <span className="capitalize">{species}</span>: {count}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics - Side by Side */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800 p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Age Distribution</h4>
          <div className="space-y-3">
            {Object.entries(ageDistribution).map(([range, count]) => {
              const percentage = data.animals.length > 0 ? Math.round((count / data.animals.length) * 100) : 0;
              return (
                <div key={range}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{range}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-black dark:bg-blue-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800 p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Species Overview</h4>
          <div className="space-y-2">
            {speciesData.map(([species, count]) => {
              const percentage = Math.round((count / data.animals.length) * 100);
              return (
                <div key={species} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{species}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{count}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}