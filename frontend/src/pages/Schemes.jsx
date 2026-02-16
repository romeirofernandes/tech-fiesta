import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Building2,
    Search,
    ArrowRight,
    ExternalLink,
    Sprout,
    Loader2,
    RefreshCw
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Schemes() {
    const navigate = useNavigate();
    const [schemes, setSchemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchSchemes();
    }, []);

    const fetchSchemes = async () => {
        setLoading(true);
        setError(null);
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.get(`${base}/api/schemes`);
            console.log("Fetched Schemes Data:", res.data);
            setSchemes(res.data);
        } catch (err) {
            console.error("Error fetching schemes:", err);
            setError("Failed to load schemes. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const filteredSchemes = schemes
        .filter(scheme => scheme.slug && scheme.slug !== 'undefined' && scheme.slug !== 'null') // STRICT VALIDATION
        .filter(scheme =>
            scheme.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            scheme.ministry.toLowerCase().includes(searchTerm.toLowerCase()) ||
            scheme.description.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <Layout>
            <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Sprout className="h-8 w-8 text-primary" />
                            Government Schemes
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Live list of agricultural policies and benefits from Wikipedia
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {loading && <span className="text-xs text-muted-foreground animate-pulse">Updating...</span>}
                        <Button variant="outline" size="sm" onClick={fetchSchemes} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search schemes by name, ministry, or keyword..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Scheme Grid */}
                {error ? (
                    <div className="text-center py-12 bg-destructive/5 rounded-lg border border-destructive/20">
                        <p className="text-destructive font-medium">{error}</p>
                        <Button variant="link" onClick={fetchSchemes} className="mt-2">Retry</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading && schemes.length === 0 ? (
                            // Loading Skeletons
                            Array.from({ length: 6 }).map((_, i) => (
                                <Card key={i} className="animate-pulse">
                                    <CardHeader className="space-y-2">
                                        <div className="h-4 bg-muted rounded w-3/4"></div>
                                        <div className="h-3 bg-muted rounded w-1/2"></div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-20 bg-muted rounded"></div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : filteredSchemes.length > 0 ? (
                            filteredSchemes.map((scheme, index) => (
                                <Card key={index} className="flex flex-col h-full hover:shadow-md transition-shadow duration-200">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="space-y-1">
                                                <CardTitle className="text-lg leading-tight line-clamp-2" title={scheme.title}>
                                                    {scheme.title}
                                                </CardTitle>
                                                <CardDescription className="flex items-center gap-1 text-xs">
                                                    <Building2 className="h-3 w-3" />
                                                    {scheme.ministry}
                                                </CardDescription>
                                            </div>
                                            {scheme.link && (
                                                <a
                                                    href={scheme.link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-muted-foreground hover:text-primary transition-colors"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col justify-between gap-4">
                                        <p className="text-sm text-muted-foreground line-clamp-3">
                                            {scheme.description}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mt-auto pt-2">
                                            {scheme.tags?.map((tag, i) => (
                                                <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0 h-5">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>

                                        {scheme.slug && (
                                            <Button
                                                className="w-full mt-2"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => navigate(`/schemes/${scheme.slug}`)}
                                            >
                                                View Details <ArrowRight className="ml-2 h-3 w-3" />
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center text-muted-foreground">
                                No schemes found matching "{searchTerm}"
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}
