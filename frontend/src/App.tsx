import AppLayout from "./components/layout/AppLayout"
import ChatInterface from "./components/features/ChatInterface"
import { ThemeProvider } from "./components/ui/ThemeProvider"

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AppLayout>
        <ChatInterface />
      </AppLayout>
    </ThemeProvider>
  )
}
