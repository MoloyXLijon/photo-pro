import React, { useState, useEffect } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { ResultViewer } from './components/ResultViewer';
import { HistoryList } from './components/HistoryList';
import { generateIdPhoto } from './services/gemini';
import { Sparkles, User, ShieldCheck, Camera, Clock } from 'lucide-react';

const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState<string>("black formal suit and tie");
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for rate limiting
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleImageSelect = (data: string, type: string) => {
    setSelectedImage(data);
    setMimeType(type);
    setResultImage(null);
    setError(null);
  };

  const handleClear = () => {
    setSelectedImage(null);
    setMimeType('');
    setResultImage(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setError(null);

    // Highly optimized prompt for ID photos with strict face preservation
    const prompt = `Task: Photo editing. Create a professional passport ID photo.
    
    STRICT RULES:
    1. FACE PRESERVATION: DO NOT CHANGE THE FACE. Keep the facial features, skin texture, and head shape 100% IDENTICAL to the original. This is the most important rule.
    2. CLOTHING: Replace the outfit with a ${customInstructions}. It must look realistic and fit the neck/shoulders perfectly.
    3. BACKGROUND: Change background to a solid clean WHITE color.
    4. CROP: Passport size (3:4 ratio), head centered, shoulders visible.
    5. LIGHTING: Ensure even, professional lighting on the face.`;

    try {
      const generatedImage = await generateIdPhoto({
        imageBase64: selectedImage,
        mimeType,
        prompt,
      });
      setResultImage(generatedImage);
      setHistory(prev => [generatedImage, ...prev]);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to generate image. Please try again.";
      setError(errorMessage);
      
      // If we hit a rate limit, force a cooldown to prevent spamming
      if (errorMessage.includes("Rate Limit") || errorMessage.includes("429") || errorMessage.includes("Busy")) {
        setCooldown(60);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              ID Photo Pro
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <span className="hidden sm:inline-flex items-center gap-1">
              <Camera size={16} /> Passport Size
            </span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <User size={16} /> Formal Wear
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Section */}
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl mb-3">
            Professional ID Photos in Seconds
          </h2>
          <p className="text-lg text-slate-600">
            Upload a casual selfie, and our AI will transform it into a compliant passport-style photo with a white background and formal suit.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left Column: Input */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">1</span>
                  Upload Photo
                </h3>
              </div>
              <ImageUpload
                onImageSelect={handleImageSelect}
                selectedImage={selectedImage}
                onClear={handleClear}
              />
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">2</span>
                  Customize
                </h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Clothing Style (Dress Code)
                  </label>
                  <input
                    type="text"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-800"
                    placeholder="E.g., black formal suit, tuxedo, blue shirt"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    What should the person wear in the ID photo?
                  </p>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!selectedImage || isLoading || cooldown > 0}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 ${
                    !selectedImage || isLoading || cooldown > 0
                      ? 'bg-slate-300 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-indigo-500/25'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <Clock size={20} />
                      Wait {cooldown}s
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Generate ID Photo
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Tips Section */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h4 className="font-semibold text-blue-900 mb-2 text-sm">Best Result Tips:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Use a photo with good lighting on the face.</li>
                <li>Face the camera directly (no side profiles).</li>
                <li>Ensure the original face is clearly visible.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:sticky lg:top-24">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">3</span>
                  Result
                </h3>
                {resultImage && <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Completed</span>}
              </div>
              
              <div className="flex-1">
                <ResultViewer
                  isLoading={isLoading}
                  resultImage={resultImage}
                  error={error}
                  onRetry={handleGenerate}
                />
              </div>
            </div>

            {/* History Section */}
            <HistoryList history={history} onSelect={setResultImage} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;