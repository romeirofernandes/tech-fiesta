import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  MapPin,
  Users,
  Search,
  ArrowUpDown,
  Filter,
  Activity,
} from "lucide-react";

export default function OperationalInsights() {
  const [data, setData] = useState({
    farms: [],
    animals: [],
    loading: true,
    error: null,
  });

  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterHealth, setFilterHealth] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL;

      const [farmsRes, animalsRes] = await Promise.all([
        fetch(`${baseURL}/api/farms`),
        fetch(`${baseURL}/api/animals`),
      ]);

      if (!farmsRes.ok || !animalsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const farmsData = await farmsRes.json();
      const animalsData = await animalsRes.json();

      setData({
        farms: Array.isArray(farmsData) ? farmsData : farmsData.data || [],
        animals: Array.isArray(animalsData)
          ? animalsData
          : animalsData.data || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  };

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground">Loading data...</span>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <p className="text-sm text-destructive">Error: {data.error}</p>
        <button
          onClick={fetchData}
          className="mt-2 text-sm text-destructive hover:text-destructive/80 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const farmMetrics = data.farms.map((farm) => {
    const farmAnimals = data.animals.filter((a) => {
      // Handle both populated (object) and unpopulated (string) farmId
      const animalFarmId = typeof a.farmId === 'object' ? a.farmId?._id : a.farmId;
      return animalFarmId === farm._id;
    });
    
    const speciesBreakdown = farmAnimals.reduce((acc, animal) => {
      const species = animal.species || "Unknown";
      acc[species] = (acc[species] || 0) + 1;
      return acc;
    }, {});

    // Since there's no healthStatus in API, assume all animals are healthy for now
    const healthRate = farmAnimals.length > 0 ? 100 : 0;

    return {
      ...farm,
      animalCount: farmAnimals.length,
      speciesBreakdown,
      healthRate,
    };
  });

  const filteredFarms = farmMetrics
    .filter((farm) => {
      const farmName = farm.name || farm.farmName || "";
      const farmLocation = farm.location || farm.address || "";
      const matchesSearch =
        farmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmLocation.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesHealth =
        filterHealth === "all" ||
        (filterHealth === "good" && farm.healthRate >= 80) ||
        (filterHealth === "attention" && farm.healthRate < 80);
      return matchesSearch && matchesHealth;
    })
    .sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "name":
          aVal = (a.name || a.farmName || "").toLowerCase();
          bVal = (b.name || b.farmName || "").toLowerCase();
          break;
        case "animals":
          aVal = a.animalCount;
          bVal = b.animalCount;
          break;
        
          
        case "species":
          aVal = Object.keys(a.speciesBreakdown).length;
          bVal = Object.keys(b.speciesBreakdown).length;
          break;
        default:
          return 0;
      }

      if (typeof aVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

  const ageDistribution = (() => {
    const distribution = {
      "Young (< 1 year)": 0,
      "Adult (1-5 years)": 0,
      "Mature (5+ years)": 0,
    };

    data.animals.forEach((animal) => {
      const age = animal.age || 0;
      const ageUnit = animal.ageUnit || "months";
      const ageInYears = ageUnit === "months" ? age / 12 : age;
      if (ageInYears < 1) distribution["Young (< 1 year)"]++;
      else if (ageInYears <= 5) distribution["Adult (1-5 years)"]++;
      else distribution["Mature (5+ years)"]++;
    });

    return distribution;
  })();

  const speciesData = Object.entries(
    data.animals.reduce((acc, animal) => {
      const species = animal.species || "Unknown";
      acc[species] = (acc[species] || 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Compact Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-chart-2/20 rounded-lg">
              <MapPin className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {data.farms.length}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Farms
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {data.animals.length}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Animals
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-chart-5/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-chart-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {data.farms.length > 0
                  ? Math.round(data.animals.length / data.farms.length)
                  : 0}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Avg/Farm
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-chart-3/20 rounded-lg">
              <Activity className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {speciesData.length}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Species
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search farms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          

          <button
            onClick={() => toggleSort("animals")}
            className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
              sortBy === "animals"
                ? "bg-primary text-primary-foreground"
                : "bg-background border border-border text-foreground hover:bg-accent"
            }`}
          >
            Animals {sortBy === "animals" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>

          

          <button
            onClick={() => toggleSort("species")}
            className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
              sortBy === "species"
                ? "bg-primary text-primary-foreground"
                : "bg-background border border-border text-foreground hover:bg-accent"
            }`}
          >
            Diversity{" "}
            {sortBy === "species" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
        </div>
      </div>

      {/* Compact Table */}
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Farm Operations ({filteredFarms.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Farm
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Animals
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Species
                </th>
                
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Distribution
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredFarms.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No farms found
                  </td>
                </tr>
              ) : (
                filteredFarms.map((farm, idx) => (
                  <tr
                    key={farm._id}
                    className={`hover:bg-accent transition-colors ${idx % 2 === 0 ? "bg-card" : "bg-muted/50"}`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {farm.name || farm.farmName}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-muted-foreground">
                        {farm.location || farm.address || "N/A"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-foreground">
                        {farm.animalCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-foreground">
                        {Object.keys(farm.speciesBreakdown).length}
                      </span>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(farm.speciesBreakdown)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([species, count]) => (
                            <span
                              key={species}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-foreground"
                            >
                              <span className="capitalize">{species}</span>:{" "}
                              {count}
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
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <h4 className="text-sm font-semibold text-foreground mb-4">
            Age Distribution
          </h4>
          <div className="space-y-3">
            {Object.entries(ageDistribution).map(([range, count]) => {
              const percentage =
                data.animals.length > 0
                  ? Math.round((count / data.animals.length) * 100)
                  : 0;
              return (
                <div key={range}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">
                      {range}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <h4 className="text-sm font-semibold text-foreground mb-4">
            Species Overview
          </h4>
          <div className="space-y-2">
            {speciesData.map(([species, count]) => {
              const percentage = Math.round(
                (count / data.animals.length) * 100,
              );
              return (
                <div
                  key={species}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm font-medium text-foreground capitalize">
                    {species}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {count}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({percentage}%)
                    </span>
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