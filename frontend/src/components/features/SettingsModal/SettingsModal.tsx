import { useState, useEffect } from "react"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"

export function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [provider, setProvider] = useState("ollama")
  const [apiUrl, setApiUrl] = useState("")
  const [apiKey, setApiKey] = useState("")

  // Load configuration from local storage on mount
  useEffect(() => {
    setProvider(localStorage.getItem("docuquery-provider") || "ollama")
    setApiUrl(localStorage.getItem("docuquery-api-url") || "http://localhost:8000")
    setApiKey(localStorage.getItem("docuquery-api-key") || "")
  }, [])

  const handleSave = () => {
    localStorage.setItem("docuquery-provider", provider)
    localStorage.setItem("docuquery-api-url", apiUrl || "http://localhost:8000")
    localStorage.setItem("docuquery-api-key", apiKey)
    setIsOpen(false)
    // Reload page to apply new API URL if it changed
    window.location.reload()
  }

  const handleCancel = () => {
    setProvider(localStorage.getItem("docuquery-provider") || "ollama")
    setApiUrl(localStorage.getItem("docuquery-api-url") || "http://localhost:8000")
    setApiKey(localStorage.getItem("docuquery-api-key") || "")
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="icon" className="rounded-full w-9 h-9 hover:bg-accent cursor-pointer">
            <Settings className="h-[1.2rem] w-[1.2rem] text-foreground" />
            <span className="sr-only">Open Settings</span>
          </Button>
        }
      />
      <DialogContent className="w-[90%] max-w-sm sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">Settings</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="provider">AI Backend Provider</Label>
            <Select
              value={provider}
              onValueChange={(val) => { if (val) setProvider(val); }}
            >
              <SelectTrigger id="provider" className="cursor-pointer">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ollama" className="cursor-pointer">Local Ollama (FastAPI Backend)</SelectItem>
                <SelectItem value="gemini" className="cursor-pointer">Google Gemini (Direct / Proxy)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Note: Changing the provider might require resetting active document chunks due to dimension mismatch.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="api-url">Backend Server URL</Label>
            <Input
              id="api-url"
              type="text"
              placeholder="http://localhost:8000"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The address of your FastAPI orchestrator server.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="apikey">Custom API Key (Optional)</Label>
            <Input
              id="apikey"
              type="password"
              placeholder="Leave blank for local setups"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used if your backend server is behind an authentication proxy.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="ghost" onClick={handleCancel} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleSave} className="cursor-pointer">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
