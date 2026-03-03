import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, Loader2 } from "lucide-react";

export default function StoreMessageButton({ store, productId }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState(productId ? "Question about a product" : "Question about your store");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  const submit = async () => {
    if (!store?.id || !subject.trim() || !message.trim()) return;
    setSending(true);
    setStatus("");

    try {
      const res = await base44.functions.invoke("contactStoreMessage", {
        storeId: store.id,
        productId,
        subject,
        message,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setStatus("Message sent successfully.");
      setMessage("");
      setTimeout(() => setOpen(false), 700);
    } catch (err) {
      setStatus(err.message || "Failed to send message.");
    }

    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">
          <Mail className="w-4 h-4 mr-2" /> Message Store
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contact {store?.name}</DialogTitle>
          <DialogDescription>Send a message through GOOBY to this store.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message"
            rows={5}
          />
          {status && <p className="text-sm text-gray-600">{status}</p>}
          <Button onClick={submit} disabled={sending || !message.trim()} className="w-full bg-blue-600 hover:bg-blue-700">
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
            Send Message
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}