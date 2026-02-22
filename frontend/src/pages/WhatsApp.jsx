import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  Unlink,
  Copy,
  LogOut,
  FileText,
  Camera,
  Mic,
  PawPrint,
  List,
  Shield,
  RefreshCw,
  Stethoscope,
  BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE_URL;
const WA_NUMBER = "+14155238886";

export default function WhatsApp() {
  const { mongoUser, logout } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [linkStatus, setLinkStatus] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (mongoUser?.email) {
      checkStatus(mongoUser.email);
      pollRef.current = setInterval(() => checkStatus(mongoUser.email), 4000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [mongoUser]);

  const checkStatus = async (email) => {
    try {
      const res = await fetch(`${API}/api/whatsapp/status?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setLinkStatus(data);
    } catch { /* ignore */ }
  };

  const handleUnlink = async () => {
    if (!window.confirm("Unlink your WhatsApp account?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/whatsapp/unlink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mongoUser?.email })
      });
      if (res.ok) { setLinkStatus(null); toast.success("WhatsApp unlinked"); }
      else toast.error("Failed to unlink");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleCopyOtp = () => {
    if (linkStatus?.pendingOtp) {
      navigator.clipboard.writeText(linkStatus.pendingOtp);
      toast.success("OTP copied!");
    }
  };

  const isLinked = linkStatus?.linked;
  const pendingOtp = linkStatus?.pendingOtp;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-7 w-7 text-green-500" />
              <h1 className="text-2xl font-bold">WhatsApp Integration</h1>
              {isLinked ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Linked
                </Badge>
              ) : (
                <Badge variant="outline">
                  <XCircle className="h-3 w-3 mr-1" /> Not Linked
                </Badge>
              )}
              {isLinked && linkStatus.chat_id && (
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {linkStatus.chat_id.replace("whatsapp:", "")}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5 ml-10">
              Manage your farm animals directly from WhatsApp
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>

        {/* ── OTP Card (shown when login is in progress) ── */}
        {pendingOtp && !isLinked && (
          <Card className="border-yellow-500/40 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <Shield className="h-5 w-5" />
                Your Login OTP
              </CardTitle>
              <CardDescription>
                Copy this code and send it back to the WhatsApp bot to complete login
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="text-5xl font-mono font-bold tracking-[0.4em] text-yellow-700 dark:text-yellow-300 bg-yellow-500/10 px-8 py-4 rounded-xl border-2 border-dashed border-yellow-500/40 select-all">
                  {pendingOtp}
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyOtp}>
                    <Copy className="h-4 w-4 mr-2" /> Copy OTP
                  </Button>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Waiting for verification...
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Code expires in 10 minutes. Type it in the WhatsApp chat with the bot to link your account.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column: Login steps + Open WhatsApp ── */}
          <div className="lg:col-span-1 space-y-4">

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" /> How to Login
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">1</div>
                  <p className="text-muted-foreground">Send <b>1</b> or <b>login</b> to the bot number <b>{WA_NUMBER}</b></p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">2</div>
                  <p className="text-muted-foreground">Bot asks for your email. Send your registered email.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">3</div>
                  <p className="text-muted-foreground">Come back here — your OTP appears above. Copy and send it in WhatsApp.</p>
                </div>

                {!isLinked && (
                  <a
                    href={`https://wa.me/${WA_NUMBER.replace("+", "")}?text=login`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-green-600 hover:bg-green-700 mt-2">
                      <MessageCircle className="h-4 w-4 mr-2" /> Open WhatsApp to Login
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Linked / unlink */}
            {isLinked && (
              <Card className="border-green-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" /> Account Linked
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Your WhatsApp is connected. Use the bot commands to manage your farm.
                  </p>
                  {linkStatus?.chat_id && (
                    <p className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                      {linkStatus.chat_id.replace("whatsapp:", "")}
                    </p>
                  )}
                  <Button variant="destructive" size="sm" onClick={handleUnlink} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unlink className="h-4 w-4 mr-2" />}
                    Unlink WhatsApp
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Other commands */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <List className="h-4 w-4" /> All Commands
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { cmd: "1", label: "Login", desc: "Link your WhatsApp account" },
                  { cmd: "2", label: "Add Animal", desc: "Add via text, photo, or voice" },
                  { cmd: "3", label: "My Animals", desc: "View all registered animals" },
                  { cmd: "4", label: "Logout", desc: "Unlink WhatsApp account" },
                  { cmd: "5", label: "Disease Check", desc: "AI health check from photo" },
                  { cmd: "6", label: "Farm Report", desc: "Quick farm summary" },
                  { cmd: "help", label: "Help", desc: "Show the command menu" },
                  { cmd: "0", label: "Cancel", desc: "Cancel any ongoing operation" },
                ].map(({ cmd, label, desc }) => (
                  <div key={cmd} className="flex items-start gap-2">
                    <Badge variant="outline" className="font-mono shrink-0 w-14 justify-center text-xs">{cmd}</Badge>
                    <div>
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground"> — {desc}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── Right column: Bot Features ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Add Animal */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PawPrint className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Add Animal</h2>
                <Badge variant="secondary" className="text-[10px]">Send 2</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    icon: FileText,
                    title: "Text",
                    cmd: "2 → 1",
                    desc: "Step-by-step form — name, species, breed, gender, age",
                  },
                  {
                    icon: Camera,
                    title: "Photo",
                    cmd: "2 → 2",
                    desc: "Send a photo — AI detects species, breed & estimates details",
                  },
                  {
                    icon: Mic,
                    title: "Voice",
                    cmd: "2 → 3",
                    desc: "Record a voice note describing the animal in any language",
                  },
                ].map(({ icon: Icon, title, cmd, desc }) => (
                  <Card key={title}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{title}</p>
                          <Badge variant="outline" className="text-[10px] font-mono">{cmd}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Photo and Voice methods show detected details for confirmation before saving. Send <b>0</b> anytime to cancel.
              </p>
            </div>

            {/* Disease Check */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Disease Check</h2>
                <Badge variant="secondary" className="text-[10px]">Send 5</Badge>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <Stethoscope className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold">AI Health Check</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Send a photo of the affected area. The AI provides a preliminary assessment with the suspected condition, severity, and confidence level.
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 italic">
                        Disclaimer: AI-based only — not a substitute for professional veterinary care. Always consult a vet.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Farm Report */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Farm Report</h2>
                <Badge variant="secondary" className="text-[10px]">Send 6</Badge>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold">Quick Farm Summary</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Get a text-based summary of your farm — livestock count, species breakdown, production, revenue, expenses, vaccinations, and health alerts from the last 30 days.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}

