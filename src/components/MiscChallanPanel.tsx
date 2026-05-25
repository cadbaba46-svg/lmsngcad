import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const MiscChallanPanel = () => {
  const { user } = useAuth();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_cnic: "",
    amount: "",
    description: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, email, phone, cnic")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setForm((p) => ({
          ...p,
          customer_name: data?.full_name || "",
          customer_email: data?.email || user.email || "",
          customer_phone: data?.phone || "",
          customer_cnic: data?.cnic || "",
        }));
        setLoadingProfile(false);
      });
  }, [user]);

  const handleChange = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_cnic) {
      toast.error("CNIC is required to generate a challan.");
      return;
    }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("challans").insert({
      challan_number: "",
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      customer_cnic: form.customer_cnic,
      amount: amt,
      description: form.description || "Miscellaneous Challan",
      status: "unpaid",
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Challan created. Check Fee Challans to view it.");
    setForm((p) => ({ ...p, amount: "", description: "" }));
  };

  if (loadingProfile) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5" /> Create Bill Online
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Generate a miscellaneous challan under your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-lg p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.customer_name} onChange={handleChange("customer_name")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnic">CNIC</Label>
            <Input id="cnic" value={form.customer_cnic} onChange={handleChange("customer_cnic")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.customer_email} onChange={handleChange("customer_email")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.customer_phone} onChange={handleChange("customer_phone")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="amount">Amount (PKR)</Label>
            <Input id="amount" type="number" min="1" step="1" value={form.amount} onChange={handleChange("amount")} required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} value={form.description} onChange={handleChange("description")} placeholder="What is this challan for?" />
          </div>
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Generating..." : "Generate Challan"}
        </Button>
      </form>
    </div>
  );
};

export default MiscChallanPanel;
