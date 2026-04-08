import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Languages, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Sparkles, 
  Info,
  RotateCcw,
  Type as TypeIcon,
  ChevronRight,
  Loader2,
  Globe,
  Layout,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  ArrowRight,
  FileText,
  Save,
  Trash2,
  Target,
  Trophy,
  ChevronDown,
  ExternalLink,
  ArrowLeftRight,
  MessageSquare,
  Send,
  User,
  Bot
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { correctGrammar, type GrammarResult, type Correction, chatWithAI, type ChatMessage } from '@/lib/gemini';
import { cn } from '@/lib/utils';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<GrammarResult | null>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [tone, setTone] = useState('professional');
  const [copied, setCopied] = useState(false);
  
  // New features state
  const [url, setUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isSidebarMode, setIsSidebarMode] = useState(true);
  const [isFullPageEditor, setIsFullPageEditor] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  
  // Chat State
  const [sidebarTab, setSidebarTab] = useState<'corrections' | 'chat'>('corrections');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Extension Goals State
  const [goals, setGoals] = useState({
    audience: 'general',
    formality: 'neutral',
    intent: 'inform'
  });
  const [score, setScore] = useState(100);

  // Notes Simulation State
  const [notesTitle, setNotesTitle] = useState('My Letter');
  const [notesContent, setNotesContent] = useState('Dear Team,\n\nI am writing to inform you that I will be late for the meeting today. I has some car trouble and it taking longer than expected to fix. I hope you understands.\n\nBest regards,\nJohn');
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const handleCorrection = useCallback(async (text: string, currentTone: string) => {
    if (!text.trim() || text.length < 5) {
      setResult(null);
      return;
    }

    setIsCorrecting(true);
    try {
      const correctionResult = await correctGrammar(text, currentTone);
      setResult(correctionResult);
    } catch (error) {
      toast.error('Failed to correct text. Please try again.');
      console.error(error);
    } finally {
      setIsCorrecting(false);
    }
  }, []);

  // Calculate writing score
  useEffect(() => {
    if (!result) {
      setScore(100);
      return;
    }
    const errorCount = result.corrections.length;
    const textLength = (isSidebarMode ? notesContent : inputText).length;
    if (textLength === 0) {
      setScore(100);
      return;
    }
    // Simple score: 100 minus weighted error count
    const calculatedScore = Math.max(0, 100 - (errorCount * 5));
    setScore(calculatedScore);
  }, [result, notesContent, inputText, isSidebarMode]);

  // Debounce correction for both main input and notes
  useEffect(() => {
    const textToCorrect = isSidebarMode ? notesContent : inputText;
    const timer = setTimeout(() => {
      handleCorrection(textToCorrect, tone);
    }, 1200);

    return () => clearTimeout(timer);
  }, [inputText, notesContent, tone, handleCorrection, isSidebarMode]);

  const fetchPageContent = async () => {
    if (!url.trim()) return;
    
    setIsFetching(true);
    try {
      // Add protocol if missing
      let targetUrl = url.trim();
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }

      const response = await fetch('/api/fetch-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setInputText(data.text);
      toast.success('Page content imported successfully');
    } catch (error) {
      toast.error('Could not fetch the page. Check the URL or try another site.');
      console.error(error);
    } finally {
      setIsFetching(false);
    }
  };

  const copyToClipboard = async () => {
    if (result?.correctedText) {
      await navigator.clipboard.writeText(result.correctedText);
      setCopied(true);
      toast.success('Corrected text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const applyToNotes = () => {
    if (result?.correctedText) {
      setNotesContent(result.correctedText);
      toast.success('Applied corrections to your note!');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    const newMessages = [...chatMessages, userMessage];
    
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatting(true);

    try {
      const context = isSidebarMode ? notesContent : inputText;
      const response = await chatWithAI(newMessages, context);
      setChatMessages([...newMessages, { role: 'model', content: response }]);
    } catch (error) {
      toast.error('Failed to get response');
    } finally {
      setIsChatting(false);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const clearAll = () => {
    if (isSidebarMode) {
      setNotesContent('');
    } else {
      setInputText('');
    }
    setResult(null);
    setUrl('');
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-orange-100 overflow-x-hidden">
        <Toaster position="top-center" />
        
        <div className="flex h-screen overflow-hidden">
          
          {/* Main Workspace (Notes App Simulation when Sidebar is on) */}
          <div className={cn(
            "flex-1 flex flex-col transition-all duration-500 bg-white",
            isSidebarMode ? "mr-[400px]" : "mr-0"
          )}>
            {isSidebarMode ? (
              // Notes App Simulation
              <div className="flex flex-col h-full bg-[#f9f9f9]">
                <header className="h-14 border-b bg-white px-6 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center">
                      <FileText className="w-5 h-5 text-yellow-800" />
                    </div>
                    <Input 
                      value={notesTitle} 
                      onChange={(e) => setNotesTitle(e.target.value)}
                      className="border-none shadow-none font-semibold text-lg p-0 h-auto focus-visible:ring-0 w-[200px]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-gray-400">
                      <Save className="w-4 h-4 mr-2" /> Save
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => setNotesContent('')}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </header>
                
                <div className="flex-1 p-12 overflow-auto">
                  <div className="max-w-3xl mx-auto bg-white shadow-sm ring-1 ring-gray-200 rounded-lg min-h-[80%] p-12 relative group">
                    <textarea 
                      ref={notesRef}
                      className="w-full h-full min-h-[500px] border-none focus:ring-0 resize-none text-xl leading-relaxed font-serif outline-none"
                      placeholder="Start writing your letter..."
                      value={notesContent}
                      onChange={(e) => setNotesContent(e.target.value)}
                    />
                    
                    {/* Floating Extension Badge */}
                    <div className="absolute bottom-6 right-6 flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 active:scale-95",
                            isCorrecting ? "bg-orange-400 animate-pulse" : "bg-orange-500"
                          )}>
                            {isCorrecting ? (
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            ) : (
                              <div className="relative">
                                <Languages className="w-5 h-5 text-white" />
                                {result && result.corrections.length > 0 && (
                                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                    {result.corrections.length}
                                  </span>
                                )}
                              </div>
                            )}
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0 overflow-hidden rounded-xl shadow-2xl border-none" align="end">
                          <div className="bg-orange-500 p-4 text-white">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold uppercase tracking-wider">Overall Score</span>
                              <span className="text-2xl font-black">{score}</span>
                            </div>
                            <Progress value={score} className="h-1.5 bg-orange-300/50" />
                          </div>
                          <div className="p-4 bg-white space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500 font-medium">Corrections</span>
                              <Badge variant="secondary" className="bg-red-50 text-red-600 border-red-100">{result?.corrections.length || 0}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500 font-medium">Tone</span>
                              <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 capitalize">{tone}</Badge>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full text-[10px] h-8 rounded-lg border-orange-200 text-orange-600 hover:bg-orange-50"
                              onClick={() => {
                                setIsSidebarMode(true);
                                setSidebarTab('corrections');
                              }}
                            >
                              Open Sidebar
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                
                <div className="h-10 border-t bg-white px-6 flex items-center justify-between text-[10px] text-gray-400 uppercase tracking-widest font-medium">
                  <span>Notes Workspace Simulation</span>
                  <span>{notesContent.split(/\s+/).filter(Boolean).length} words</span>
                </div>
              </div>
            ) : (
              // Standard App View
              <div className="flex flex-col h-full overflow-auto">
                <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-20">
                  <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
                        <Languages className="text-white w-5 h-5" />
                      </div>
                      <h1 className="text-xl font-semibold tracking-tight">Linguist AI</h1>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 border-orange-200 text-orange-600 hover:bg-orange-50"
                        onClick={() => setShowInstallGuide(true)}
                      >
                        How to Install Extension
                      </Button>
                      <div className="hidden md:flex items-center gap-2 mr-4">
                        <Switch 
                          id="sidebar-mode" 
                          checked={isSidebarMode} 
                          onCheckedChange={setIsSidebarMode} 
                        />
                        <Label htmlFor="sidebar-mode" className="text-xs font-medium uppercase tracking-wider text-gray-400 cursor-pointer">Extension Mode</Label>
                      </div>
                      
                      <Tabs value={tone} onValueChange={setTone} className="w-[300px]">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="professional">Pro</TabsTrigger>
                          <TabsTrigger value="casual">Casual</TabsTrigger>
                          <TabsTrigger value="academic">Academic</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                </header>

                <main className="max-w-6xl mx-auto px-4 py-8 w-full">
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Import from Web</h2>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Enter a URL to correct the whole page..." 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="bg-white border-gray-200 focus-visible:ring-orange-500"
                        onKeyDown={(e) => e.key === 'Enter' && fetchPageContent()}
                      />
                      <Button 
                        onClick={fetchPageContent} 
                        disabled={isFetching || !url}
                        className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0"
                      >
                        {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Import
                      </Button>
                    </div>
                  </div>

                  <div className={cn(
                    "grid gap-8",
                    isFullPageEditor ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
                  )}>
                    <div className={cn("space-y-4", isFullPageEditor && "lg:col-span-2")}>
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500 flex items-center gap-2">
                          <TypeIcon className="w-4 h-4" />
                          Your Text
                        </h2>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-400">{inputText.length} characters</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-gray-400 hover:text-orange-500"
                            onClick={() => setIsFullPageEditor(!isFullPageEditor)}
                          >
                            {isFullPageEditor ? <Minimize2 className="w-3 h-3 mr-1" /> : <Maximize2 className="w-3 h-3 mr-1" />}
                            {isFullPageEditor ? 'Split' : 'Full'}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearAll}>
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <Card className="border-none shadow-sm overflow-hidden ring-1 ring-gray-200 focus-within:ring-orange-500 transition-shadow">
                        <Textarea 
                          placeholder="Paste or type your text here..."
                          className={cn(
                            "border-none focus-visible:ring-0 resize-none text-lg leading-relaxed p-6",
                            isFullPageEditor ? "min-h-[600px]" : "min-h-[400px]"
                          )}
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                        />
                      </Card>
                    </div>

                    {!isFullPageEditor && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-orange-500" />
                            Corrections
                          </h2>
                          {isCorrecting && (
                            <div className="flex items-center gap-2 text-xs text-orange-500 font-medium">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Analyzing...
                            </div>
                          )}
                        </div>
                        <CorrectionPanel 
                          result={result} 
                          isCorrecting={isCorrecting} 
                          copied={copied} 
                          copyToClipboard={copyToClipboard} 
                          isSidebar={false}
                        />
                      </div>
                    )}
                  </div>
                  
                  {isFullPageEditor && (
                    <div className="mt-12 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-orange-500" />
                          Corrections
                        </h2>
                        {isCorrecting && (
                          <div className="flex items-center gap-2 text-xs text-orange-500 font-medium">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Analyzing...
                          </div>
                        )}
                      </div>
                      <CorrectionPanel 
                        result={result} 
                        isCorrecting={isCorrecting} 
                        copied={copied} 
                        copyToClipboard={copyToClipboard} 
                        isSidebar={false}
                      />
                    </div>
                  )}
                </main>
              </div>
            )}
          </div>

          {/* Sidebar (The "Extension") */}
          <aside className={cn(
            "fixed top-0 right-0 h-full w-[400px] bg-white border-l shadow-2xl z-50 transition-transform duration-500 flex flex-col",
            isSidebarMode ? "translate-x-0" : "translate-x-full"
          )}>
            <header className="h-14 border-b px-4 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                  <Languages className="text-white w-4 h-4" />
                </div>
                <span className="font-semibold text-sm tracking-tight">Linguist AI Extension</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSidebarMode(false)}>
                <PanelRightClose className="w-4 h-4" />
              </Button>
            </header>

            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 border-b bg-white">
                  <TabsList className="flex w-full h-12 bg-transparent gap-6">
                    <TabsTrigger 
                      value="corrections" 
                      className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-widest"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-2" />
                      Corrections
                    </TabsTrigger>
                    <TabsTrigger 
                      value="chat" 
                      className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-widest"
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-2" />
                      Linguist Chat
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="corrections" className="flex-1 flex flex-col overflow-hidden m-0">
                  <div className="p-4 border-b bg-gray-50/50 space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Overall Score</span>
                        <span className={cn(
                          "text-lg font-bold",
                          score > 80 ? "text-green-600" : score > 50 ? "text-orange-500" : "text-red-500"
                        )}>{score}</span>
                      </div>
                      <Progress value={score} className={cn(
                        "h-1.5",
                        score > 80 ? "[&>div]:bg-green-500" : score > 50 ? "[&>div]:bg-orange-500" : "[&>div]:bg-red-500"
                      )} />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Goals</span>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-orange-600 hover:text-orange-700 p-0">Adjust</Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-2">
                            <Target className="w-3 h-3 text-orange-500" />
                            <span className="text-[10px] font-medium text-gray-600">Intent</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-900 capitalize">{goals.intent}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-orange-500" />
                            <span className="text-[10px] font-medium text-gray-600">Audience</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-900 capitalize">{goals.audience}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tone Settings</span>
                        <Badge variant="secondary" className="text-[9px] uppercase px-1 h-4">Active</Badge>
                      </div>
                      <Tabs value={tone} onValueChange={setTone} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-8">
                          <TabsTrigger value="professional" className="text-[10px]">Pro</TabsTrigger>
                          <TabsTrigger value="casual" className="text-[10px]">Casual</TabsTrigger>
                          <TabsTrigger value="academic" className="text-[10px]">Academic</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                          <Sparkles className="w-3 h-3 text-orange-500" />
                          Real-time Analysis
                        </h2>
                        {isCorrecting && <Loader2 className="w-3 h-3 animate-spin text-orange-500" />}
                      </div>

                      <CorrectionPanel 
                        result={result} 
                        isCorrecting={isCorrecting} 
                        copied={copied} 
                        copyToClipboard={copyToClipboard} 
                        applyToNotes={applyToNotes}
                        isSidebar={true}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 bg-gray-50/30">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {chatMessages.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
                          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                            <Bot className="w-6 h-6 text-orange-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">How can I help you today?</p>
                            <p className="text-xs text-gray-500 max-w-[200px] mt-1">Ask me to rewrite a sentence, explain a grammar rule, or brainstorm ideas.</p>
                          </div>
                        </div>
                      )}
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className={cn(
                          "flex gap-3 max-w-[85%]",
                          msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}>
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            msg.role === 'user' ? "bg-orange-500" : "bg-white border shadow-sm"
                          )}>
                            {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-orange-500" />}
                          </div>
                          <div className={cn(
                            "p-3 rounded-2xl text-sm leading-relaxed",
                            msg.role === 'user' ? "bg-orange-500 text-white rounded-tr-none" : "bg-white border shadow-sm rounded-tl-none"
                          )}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {isChatting && (
                        <div className="flex gap-3 mr-auto max-w-[85%]">
                          <div className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-orange-500" />
                          </div>
                          <div className="p-3 rounded-2xl bg-white border shadow-sm rounded-tl-none flex items-center gap-1">
                            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>
                  
                  <div className="p-4 border-t bg-white">
                    <form onSubmit={handleSendMessage} className="relative">
                      <Input 
                        placeholder="Ask Linguist AI..." 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="pr-10 h-10 rounded-xl border-gray-200 focus-visible:ring-orange-500"
                        disabled={isChatting}
                      />
                      <Button 
                        type="submit" 
                        size="icon" 
                        className="absolute right-1 top-1 h-8 w-8 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                        disabled={!chatInput.trim() || isChatting}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                    <p className="text-[9px] text-center text-gray-400 mt-2">
                      Linguist AI can make mistakes. Check important info.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <footer className="p-4 border-t bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 opacity-40">
                <Languages className="w-3 h-3" />
                <span className="text-[9px] font-bold uppercase tracking-tighter">Gemini 3.1 Pro</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 text-[9px] uppercase tracking-widest font-bold text-gray-400 hover:text-orange-500">
                Settings <ExternalLink className="w-2 h-2 ml-1" />
              </Button>
            </footer>
          </aside>
        </div>

        {/* Extension Toggle Floating Button */}
        {!isSidebarMode && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="fixed bottom-8 right-8 z-40"
          >
      <Tooltip>
        <TooltipTrigger 
          className="rounded-full w-14 h-14 shadow-2xl bg-orange-500 hover:bg-orange-600 text-white p-0 flex items-center justify-center cursor-pointer border-none outline-none transition-transform active:scale-95"
          onClick={() => setIsSidebarMode(true)}
        >
          <PanelRightOpen className="w-6 h-6" />
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Open Extension Mode</p>
        </TooltipContent>
      </Tooltip>
          </motion.div>
        )}
        {/* Installation Guide Modal */}
        <AnimatePresence>
          {showInstallGuide && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
              >
                <div className="p-6 border-b flex items-center justify-between bg-orange-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                      <Languages className="text-white w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Install Linguist AI</h3>
                      <p className="text-xs text-orange-700">Get real-time corrections anywhere</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowInstallGuide(false)}>
                    <PanelRightClose className="w-5 h-5" />
                  </Button>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">1</div>
                      <div>
                        <p className="font-semibold">Download the Package</p>
                        <p className="text-sm text-gray-500">Go to Settings &gt; Export to ZIP to get the extension source code.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">2</div>
                      <div>
                        <p className="font-semibold">Open Chrome Extensions</p>
                        <p className="text-sm text-gray-500">Type <code className="bg-gray-100 px-1 rounded">chrome://extensions</code> in your browser address bar.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">3</div>
                      <div>
                        <p className="font-semibold">Enable Developer Mode</p>
                        <p className="text-sm text-gray-500">Toggle the switch in the top-right corner of the extensions page.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">4</div>
                      <div>
                        <p className="font-semibold">Load Unpacked</p>
                        <p className="text-sm text-gray-500">Click "Load unpacked" and select the folder you extracted from the ZIP.</p>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 rounded-xl font-bold" onClick={() => setShowInstallGuide(false)}>
                    Got it, let's go!
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

interface CorrectionPanelProps {
  result: GrammarResult | null;
  isCorrecting: boolean;
  copied: boolean;
  copyToClipboard: () => void;
  applyToNotes?: () => void;
  isSidebar: boolean;
}

function CorrectionPanel({ result, isCorrecting, copied, copyToClipboard, applyToNotes, isSidebar }: CorrectionPanelProps) {
  return (
    <AnimatePresence mode="wait">
      {result ? (
        <motion.div
          key="result"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {/* Corrected Text Card */}
          <Card className={cn("border-none shadow-md bg-white overflow-hidden", isSidebar ? "ring-1 ring-gray-100" : "")}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-gray-500">Corrected Version</CardTitle>
              <div className="flex items-center gap-1">
                {applyToNotes && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[10px] uppercase font-bold border-orange-200 text-orange-600 hover:bg-orange-50"
                    onClick={applyToNotes}
                  >
                    Apply to Note
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 gap-2"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {!isSidebar && (copied ? 'Copied' : 'Copy')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className={cn("p-6 pt-2", isSidebar ? "p-4 pt-0" : "")}>
              <p className={cn("leading-relaxed whitespace-pre-wrap", isSidebar ? "text-sm" : "text-lg")}>
                {result.correctedText}
              </p>
            </CardContent>
          </Card>

          {/* Summary & Changes */}
          <div className="grid grid-cols-1 gap-4">
            <Card className="border-none shadow-sm bg-orange-50/50">
              <CardContent className="p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-900">Summary</p>
                  <p className="text-sm text-orange-800/80 leading-relaxed">{result.summary}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 px-1">Detailed Changes</h3>
              <div className="space-y-3">
                {result.corrections.map((correction, idx) => (
                  <div key={idx}>
                    <CorrectionItem correction={correction} isSidebar={isSidebar} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="placeholder"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-200 rounded-3xl",
            isSidebar ? "h-[300px] p-4" : "h-[400px]"
          )}
        >
          <div className={cn("bg-gray-100 rounded-full flex items-center justify-center mb-4", isSidebar ? "w-10 h-10" : "w-16 h-16")}>
            <Sparkles className={cn("text-gray-300", isSidebar ? "w-5 h-5" : "w-8 h-8")} />
          </div>
          <h3 className={cn("font-medium text-gray-900", isSidebar ? "text-sm" : "text-lg")}>Ready to polish</h3>
          <p className="text-xs text-gray-500 max-w-[200px] mt-2">
            {isSidebar ? "Type in your note to see real-time suggestions here." : "Start typing to see real-time grammar and spelling corrections."}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CorrectionItem({ correction, isSidebar }: { correction: Correction, isSidebar?: boolean }) {
  const typeColors = {
    grammar: 'bg-blue-100 text-blue-700 border-blue-200',
    spelling: 'bg-red-100 text-red-700 border-red-200',
    punctuation: 'bg-purple-100 text-purple-700 border-purple-200',
    style: 'bg-green-100 text-green-700 border-green-200',
    tense: 'bg-amber-100 text-amber-700 border-amber-200'
  };

  return (
    <Card className="border-none shadow-sm ring-1 ring-gray-100 hover:ring-gray-200 transition-all group">
      <CardContent className={cn("p-4", isSidebar ? "p-3" : "")}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("line-through text-gray-400 decoration-red-300/50", isSidebar ? "text-xs" : "text-sm")}>{correction.original}</span>
              <ChevronRight className="w-3 h-3 text-gray-300" />
              <span className={cn("font-semibold text-gray-900 bg-green-50 px-1 rounded", isSidebar ? "text-xs" : "text-sm")}>{correction.corrected}</span>
            </div>
            <p className="text-[10px] md:text-xs text-gray-500 leading-relaxed">{correction.explanation}</p>
          </div>
          <Badge variant="outline" className={cn("capitalize text-[9px] md:text-[10px] h-4 md:h-5 px-1 md:px-1.5", typeColors[correction.type])}>
            {correction.type}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
