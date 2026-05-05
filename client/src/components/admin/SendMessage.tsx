import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Plus, Trash2, MessageSquare, FileText, CheckCircle } from "lucide-react";

interface Recipient {
  role: "kitchen" | "driver";
  driverId?: number;
  driverName?: string;
}

export function SendMessage() {
  // State for templates section
  const [selectedTemplate, setSelectedTemplate] = useState<{ id: number; name: string; templateText: string } | null>(null);
  const [placeholderValue, setPlaceholderValue] = useState("");
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateText, setNewTemplateText] = useState("");

  // State for custom message section
  const [customMessage, setCustomMessage] = useState("");

  // State for recipient selection modal
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [messageToSend, setMessageToSend] = useState("");
  const [templateIdToSend, setTemplateIdToSend] = useState<number | undefined>(undefined);
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Queries
  const templatesQuery = trpc.messaging.getTemplates.useQuery();
  const driversQuery = trpc.drivers.list.useQuery();

  // Mutations
  const createTemplateMutation = trpc.messaging.createTemplate.useMutation({
    onSuccess: () => {
      templatesQuery.refetch();
      setShowAddTemplate(false);
      setNewTemplateName("");
      setNewTemplateText("");
    },
  });

  const deleteTemplateMutation = trpc.messaging.deleteTemplate.useMutation({
    onSuccess: () => {
      templatesQuery.refetch();
      setSelectedTemplate(null);
    },
  });

  const sendMessageMutation = trpc.messaging.sendMessage.useMutation({
    onSuccess: () => {
      setSendSuccess(true);
      setSelectedRecipients([]);
      setCustomMessage("");
      setPlaceholderValue("");
      setSelectedTemplate(null);
      setTimeout(() => {
        setSendSuccess(false);
        setShowRecipientModal(false);
      }, 1500);
    },
  });

  const onlineDrivers = (driversQuery.data || []).filter(
    (d: any) => d.status === "online"
  );

  // Extract placeholder from template text
  function getPlaceholder(templateText: string): string | null {
    const match = templateText.match(/\[([A-Z_]+)\]/);
    return match ? match[1] : null;
  }

  // Assemble message from template
  function assembleMessage(templateText: string, value: string): string {
    return templateText.replace(/\[[A-Z_]+\]/, value);
  }

  // Open recipient modal for template message
  function handleSendTemplate() {
    if (!selectedTemplate) return;
    const placeholder = getPlaceholder(selectedTemplate.templateText);
    let msg = selectedTemplate.templateText;
    if (placeholder && placeholderValue) {
      msg = assembleMessage(selectedTemplate.templateText, placeholderValue);
    }
    setMessageToSend(msg);
    setTemplateIdToSend(selectedTemplate.id);
    setShowRecipientModal(true);
  }

  // Open recipient modal for custom message
  function handleSendCustom() {
    if (!customMessage.trim()) return;
    setMessageToSend(customMessage.trim());
    setTemplateIdToSend(undefined);
    setShowRecipientModal(true);
  }

  // Toggle recipient selection
  function toggleRecipient(recipient: Recipient) {
    setSelectedRecipients((prev) => {
      const exists = prev.find(
        (r) => r.role === recipient.role && r.driverId === recipient.driverId
      );
      if (exists) {
        return prev.filter(
          (r) => !(r.role === recipient.role && r.driverId === recipient.driverId)
        );
      }
      return [...prev, recipient];
    });
  }

  // Confirm send
  function handleConfirmSend() {
    if (selectedRecipients.length === 0) return;
    sendMessageMutation.mutate({
      messageText: messageToSend,
      recipients: selectedRecipients,
      templateId: templateIdToSend,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Send Message</h2>
      </div>

      {/* Section 1: Pre-made Messages */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Pre-made Messages
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={() => setShowAddTemplate(true)}
            >
              <Plus className="w-3 h-3" />
              Add Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Template Form */}
          {showAddTemplate && (
            <div className="mb-4 p-3 border border-border rounded-md bg-muted/30 space-y-2">
              <Input
                placeholder="Template name (e.g. Order cancelled)"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
              <Input
                placeholder="Template text with [ORDER_NUMBER] or [TEXT] placeholder"
                value={newTemplateText}
                onChange={(e) => setNewTemplateText(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (newTemplateName.trim() && newTemplateText.trim()) {
                      createTemplateMutation.mutate({
                        name: newTemplateName.trim(),
                        templateText: newTemplateText.trim(),
                      });
                    }
                  }}
                  disabled={createTemplateMutation.isPending}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAddTemplate(false);
                    setNewTemplateName("");
                    setNewTemplateText("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Template List */}
          <div className="space-y-2">
            {templatesQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Loading templates...</p>
            )}
            {templatesQuery.data?.map((template: any) => (
              <div
                key={template.id}
                className={`p-3 border rounded-md cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => {
                  setSelectedTemplate(template);
                  setPlaceholderValue("");
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {template.templateText}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTemplateMutation.mutate({ id: template.id });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {templatesQuery.data?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No templates yet. Click "Add Template" to create one.
              </p>
            )}
          </div>

          {/* Placeholder Input + Send Button */}
          {selectedTemplate && (
            <div className="mt-4 p-3 border border-primary/30 rounded-md bg-primary/5 space-y-3">
              <p className="text-sm font-medium">
                Selected: <span className="text-primary">{selectedTemplate.name}</span>
              </p>
              {getPlaceholder(selectedTemplate.templateText) && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Enter {getPlaceholder(selectedTemplate.templateText)?.replace(/_/g, " ").toLowerCase()}:
                  </label>
                  <Input
                    placeholder={`Enter ${getPlaceholder(selectedTemplate.templateText)?.replace(/_/g, " ").toLowerCase()}`}
                    value={placeholderValue}
                    onChange={(e) => setPlaceholderValue(e.target.value)}
                  />
                </div>
              )}
              {placeholderValue && (
                <p className="text-xs text-muted-foreground">
                  Preview: <span className="font-medium text-foreground">{assembleMessage(selectedTemplate.templateText, placeholderValue)}</span>
                </p>
              )}
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSendTemplate}
                disabled={
                  getPlaceholder(selectedTemplate.templateText) !== null && !placeholderValue.trim()
                }
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Custom Message */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Custom Message
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <textarea
              className="w-full min-h-[100px] p-3 border border-border rounded-md text-sm resize-y bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Type your custom message here..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
            />
            <Button
              size="sm"
              className="gap-2"
              onClick={handleSendCustom}
              disabled={!customMessage.trim()}
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recipient Selection Modal */}
      <Dialog open={showRecipientModal} onOpenChange={setShowRecipientModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Recipients</DialogTitle>
          </DialogHeader>

          {sendSuccess ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
              <p className="text-sm font-medium text-green-700">Message sent successfully!</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 py-2">
                {/* Message Preview */}
                <div className="p-2 bg-muted/50 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Message:</p>
                  <p className="text-sm font-medium">{messageToSend}</p>
                </div>

                {/* Kitchen option (always available) */}
                <div
                  className="flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleRecipient({ role: "kitchen" })}
                >
                  <Checkbox
                    checked={selectedRecipients.some((r) => r.role === "kitchen")}
                    onCheckedChange={() => toggleRecipient({ role: "kitchen" })}
                  />
                  <div>
                    <p className="text-sm font-medium">Kitchen Dashboard</p>
                    <p className="text-xs text-muted-foreground">Always available</p>
                  </div>
                </div>

                {/* Online Drivers */}
                {onlineDrivers.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Online Drivers
                    </p>
                    {onlineDrivers.map((driver: any) => (
                      <div
                        key={driver.id}
                        className="flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() =>
                          toggleRecipient({
                            role: "driver",
                            driverId: driver.id,
                            driverName: driver.name,
                          })
                        }
                      >
                        <Checkbox
                          checked={selectedRecipients.some(
                            (r) => r.role === "driver" && r.driverId === driver.id
                          )}
                          onCheckedChange={() =>
                            toggleRecipient({
                              role: "driver",
                              driverId: driver.id,
                              driverName: driver.name,
                            })
                          }
                        />
                        <div>
                          <p className="text-sm font-medium">{driver.name}</p>
                          <p className="text-xs text-green-600">Online</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {onlineDrivers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No drivers currently online
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRecipientModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleConfirmSend}
                  disabled={selectedRecipients.length === 0 || sendMessageMutation.isPending}
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendMessageMutation.isPending ? "Sending..." : `Send to ${selectedRecipients.length} recipient(s)`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
