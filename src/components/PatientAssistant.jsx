import { useState, useRef, useEffect } from 'react';
import { streamPatientChat } from '../lib/gemma.js';

export default function PatientAssistant({ onPrefillNarrative, urgencyColor }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello! I'm here to help you describe how you're feeling today so the triage team can care for you quickly. What brings you to the emergency department today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  async function send() {
    if (!input.trim() || streaming) return;
    const userMsg = { role: 'user', content: input.trim() };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput('');
    setStreaming(true);

    abortRef.current = new AbortController();

    try {
      setMessages([...nextMsgs, { role: 'assistant', content: '...' }]);
      await streamPatientChat(nextMsgs, {
        onToken: (tokenText) => {
          setMessages([...nextMsgs, { role: 'assistant', content: tokenText }]);
        },
        signal: abortRef.current.signal,
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages([
          ...nextMsgs,
          {
            role: 'assistant',
            content: "I'm having trouble connecting right now, but please feel free to fill in your symptoms directly in the form below.",
          },
        ]);
      }
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div
      className="card patient-assistant"
      style={{
        marginBottom: 16,
        borderColor: urgencyColor ? `rgba(${urgencyColor}, 0.4)` : 'var(--rule)',
        boxShadow: urgencyColor ? `0 0 15px rgba(${urgencyColor}, 0.15)` : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--chalk)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: urgencyColor ? `rgb(${urgencyColor})` : 'var(--p5)' }} />
          Patient Intake Assistant
        </h3>
        <small style={{ color: 'var(--mute)', fontSize: 11 }}>gemma3:4b · Reassuring triage guide</small>
      </div>

      <div
        className="chat-window"
        style={{
          maxHeight: 180,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          paddingRight: 4,
          marginBottom: 10,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: m.role === 'user' ? 'var(--raised)' : 'var(--panel-2)',
              border: `1px solid ${m.role === 'user' ? 'var(--rule)' : 'var(--raised)'}`,
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 13,
              color: 'var(--chalk)',
            }}
          >
            <div>{m.content}</div>
            {m.role === 'user' && onPrefillNarrative && (
              <button
                type="button"
                className="btn ghost tiny"
                onClick={() => onPrefillNarrative(m.content)}
                style={{ marginTop: 4, fontSize: 10, padding: '1px 6px' }}
              >
                Use in "Patient's own words"
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          type="text"
          placeholder="Describe your main symptom or ask what to expect..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
          style={{ flex: 1, fontSize: 13 }}
        />
        <button type="submit" className="btn primary" disabled={streaming || !input.trim()}>
          {streaming ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
