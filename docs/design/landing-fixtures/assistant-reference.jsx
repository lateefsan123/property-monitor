// Static art reference using the current VoicePanel markup and production CSS.
// Fictional conversation only: no assistant session, queries, saves, or sends.
import { createRoot } from "react-dom/client";
import { AudioLines, Plus, X } from "lucide-react";
import "../../../src/index.css";
import "../../../src/voice/voice.css";
import "./assistant-reference.css";

createRoot(document.getElementById("root")).render(
  <main className="assistant-art-reference">
    <div className="repeat-assistant is-open">
      <section className="assistant-panel" aria-label="Repeat AI assistant reference">
        <header className="assistant-header">
          <span>Repeat AI</span>
          <div className="assistant-header-actions">
            <button aria-label="New chat"><Plus size={26} /></button>
            <button aria-label="Close"><X size={24} /></button>
          </div>
        </header>
        <div className="assistant-body">
          <div className="assistant-chat-log">
            <p className="assistant-chat-message is-user">Update my Forte 2 leads with the latest transactions and create a WhatsApp template.</p>
            <p className="assistant-chat-message is-assistant">Here’s a draft template for your Forte 2 leads.</p>
          </div>
          <div className="assistant-approval">
            <h3>Create template “Forte 2 follow-up”?</h3>
            <p>{"Hi Ahmed, here’s a recent sale in Forte 2:\n\n2 bed · AED 2.9M · 992 sqft\n\nWould you like to discuss selling your property?"}</p>
            <button>Confirm change</button><button>Discard</button>
          </div>
        </div>
        <footer className="assistant-footer">
          <div className="assistant-composer"><textarea aria-label="Message Repeat AI" placeholder="Message Repeat" rows={1} readOnly /></div>
          <button className="assistant-voice-toggle" aria-label="Start voice conversation"><AudioLines size={24} /></button>
        </footer>
      </section>
    </div>
  </main>,
);
