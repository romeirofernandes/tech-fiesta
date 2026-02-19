import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  Hash,
  Blocks,
  Wallet,
  Copy,
  CheckCircle,
  Clock,
  Syringe,
  Image,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const RECORDS_PER_PAGE = 10;

export default function BlockchainRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [walletInfo, setWalletInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchRecords(currentPage);
    fetchWalletInfo();
  }, []);

  const fetchRecords = async (page) => {
    setLoading(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL;
      const res = await axios.get(
        `${base}/api/vaccination-events/blockchain-records?page=${page}&limit=${RECORDS_PER_PAGE}`
      );
      setRecords(res.data.records || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
      setCurrentPage(res.data.page || 1);
    } catch (err) {
      console.error("Error fetching blockchain records:", err);
      toast.error("Failed to fetch blockchain records");
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletInfo = async () => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL;
      const res = await axios.get(`${base}/api/vaccination-events/blockchain-status`);
      setWalletInfo(res.data);
    } catch (err) {
      console.error("Error fetching wallet info:", err);
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      fetchRecords(page);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "—";
    const d = new Date(ts * 1000);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncate = (str, len = 16) => {
    if (!str) return "—";
    return str.length > len ? str.slice(0, len) + "…" : str;
  };

  // Client-side filtering on the current page
  const filteredRecords = records.filter((r) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.rfid?.toLowerCase().includes(q) ||
      r.farmerName?.toLowerCase().includes(q) ||
      r.farmerId?.toLowerCase().includes(q) ||
      r.vaccineName?.toLowerCase().includes(q) ||
      String(r.recordId).includes(q)
    );
  });

  // Generate pagination page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) pages.push("ellipsis-start");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("ellipsis-end");

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Header stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total on-chain records */}
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <Blocks className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">On-Chain Records</p>
              <p className="text-2xl font-bold">{totalRecords}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contract wallet */}
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-500/10 p-3">
              <Wallet className="h-6 w-6 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Wallet Address</p>
              {walletInfo ? (
                <div className="flex items-center gap-1">
                  <p className="text-sm font-mono truncate">
                    {walletInfo.address?.slice(0, 6)}…{walletInfo.address?.slice(-4)}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(walletInfo.address, "wallet")}
                  >
                    {copiedId === "wallet" ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Balance */}
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Network</p>
              <p className="text-lg font-bold">
                {walletInfo
                  ? `${parseFloat(walletInfo.balancePOL).toFixed(4)} POL`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Polygon Amoy Testnet</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main table card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Blockchain Vaccination Ledger
              </CardTitle>
              <CardDescription className="mt-1">
                Immutable vaccination records stored on-chain — tamper-proof and auditable
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRecords(currentPage)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="mt-4 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by RFID, farmer name, vaccine, or record ID…"
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">
                    <div className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      ID
                    </div>
                  </TableHead>
                  <TableHead>RFID</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Syringe className="h-3 w-3" />
                      Vaccine
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Timestamp
                    </div>
                  </TableHead>
                  <TableHead>Certificate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Reading from blockchain…
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Blocks className="h-8 w-8 text-muted-foreground/50" />
                        <span className="text-sm text-muted-foreground">
                          {searchTerm
                            ? "No records match your search"
                            : "No records on-chain yet"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.recordId}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          #{record.recordId}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                              {truncate(record.rfid, 12)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{record.rfid}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {record.farmerName || "—"}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {truncate(record.farmerId, 10)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-600/10 text-green-700 dark:text-green-400 border-green-600/20 hover:bg-green-600/20">
                          {record.vaccineName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(record.timestamp)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {record.certificateUrl ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={record.certificateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <Image className="h-3.5 w-3.5" />
                                View
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>Open certificate image</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing page {currentPage} of {totalPages} ({totalRecords} total records)
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={
                        currentPage <= 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {getPageNumbers().map((page, idx) =>
                    typeof page === "string" ? (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={page === currentPage}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={
                        currentPage >= totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
