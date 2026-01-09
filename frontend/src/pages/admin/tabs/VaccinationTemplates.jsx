import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Syringe, Calendar, RefreshCw, FileText } from "lucide-react";
import axios from "axios";

export default function VaccinationTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/vacxx`);
      setTemplates(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading vaccination templates...</div>;

  // Group templates by species
  const templatesBySpecies = templates.reduce((acc, template) => {
    const species = template.species || 'all';
    if (!acc[species]) acc[species] = [];
    acc[species].push(template);
    return acc;
  }, {});

  // Count templates by type
  const templateStats = {
    total: templates.length,
    recurring: templates.filter(t => t.isRecurring).length,
    mandatory: templates.filter(t => t.isMandatory).length,
    species: Object.keys(templatesBySpecies).length
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Templates</p>
                <p className="text-2xl font-bold">{templateStats.total}</p>
              </div>
              <Syringe className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recurring</p>
                <p className="text-2xl font-bold">{templateStats.recurring}</p>
                <p className="text-xs text-muted-foreground mt-1">Auto-scheduled</p>
              </div>
              <RefreshCw className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mandatory</p>
                <p className="text-2xl font-bold">{templateStats.mandatory}</p>
                <p className="text-xs text-muted-foreground mt-1">Required vaccines</p>
              </div>
              <FileText className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Species Covered</p>
                <p className="text-2xl font-bold">{templateStats.species}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates by Species */}
      <div className="space-y-6">
        {Object.entries(templatesBySpecies).map(([species, speciesTemplates]) => (
          <Card key={species}>
            <CardHeader>
              <CardTitle className="capitalize">
                {species === 'all' ? 'All Species' : species} Vaccination Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {speciesTemplates.map((template) => (
                  <div key={template._id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{template.vaccineName}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {template.isMandatory && (
                          <Badge variant="destructive">Mandatory</Badge>
                        )}
                        {template.isRecurring && (
                          <Badge variant="secondary">Recurring</Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Age: {template.ageInDays} days 
                          {template.ageRange && ` (${template.ageRange})`}
                        </span>
                      </div>
                      
                      {template.frequency && (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                          <span>Frequency: {template.frequency}</span>
                        </div>
                      )}

                      {template.nextDose && (
                        <div className="flex items-center gap-2">
                          <Syringe className="h-4 w-4 text-muted-foreground" />
                          <span>Next dose: After {template.nextDose}</span>
                        </div>
                      )}

                      {template.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Note: {template.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Reference Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Vaccination Protocol Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 rounded-lg">
              <h4 className="font-medium text-red-900 mb-2">Critical Vaccines</h4>
              <ul className="space-y-1 text-sm text-red-800">
                {templates.filter(t => t.isMandatory).map(t => (
                  <li key={t._id}>• {t.vaccineName} ({t.species || 'all'})</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Recurring Schedules</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                {templates.filter(t => t.isRecurring).map(t => (
                  <li key={t._id}>• {t.vaccineName} - {t.frequency}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Early Age Vaccines</h4>
              <ul className="space-y-1 text-sm text-green-800">
                {templates.filter(t => t.ageInDays < 60).map(t => (
                  <li key={t._id}>• {t.vaccineName} - Day {t.ageInDays}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}