// Film-only templates scene: renders the actual MessageTemplatesPanel with
// three fictional templates managed in local React state. The real onSave,
// onSetDefault and onDelete callbacks mutate the state so the panel reflects
// genuine edits. No backend — all data lives in useState.
//
// Mount: the parent harness renders <TemplatesScene /> on ?scene=templates
// inside a QueryClientProvider with App.css already loaded.
import { useCallback, useState } from 'react';
import MessageTemplatesPanel from '../../../src/features/seller-signal/components/MessageTemplatesPanel.jsx';

// Fictional templates matching the storyboard. Status IDs are the exact IDs
// the product's templateStatusOptions() returns: "none", "prospect",
// "market_appraisal", "for_sale_available".
const INTRO_CONTENT = `Hi {{name}}, I'm Sara, a broker specialising in {{building}}, Downtown Dubai.

Here are the latest transactions in your building:

{{transactions}}

If you ever think about selling, I'd be happy to tell you what your unit could achieve.`;

const APPRAISAL_CONTENT = `Hi {{name}}, following up on the appraisal we discussed for your unit in {{building}}.

Recent transactions in the building:

{{transactions}}

I'd love to arrange a time to visit and give you a proper valuation. Let me know what works.`;

const FORSALE_CONTENT = `Hi {{name}}, here's a quick update on sales activity in {{building}}.

{{transactions}}

The market is moving — let me know if you'd like to revisit your asking price or marketing approach.`;

function makeId() {
  return `film-tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const INITIAL_TEMPLATES = [
  {
    id: makeId(),
    name: 'Introduction',
    content: INTRO_CONTENT,
    statuses: ['none', 'prospect'],
    is_default: true,
    image_url: '/mobile/film/broker-card.png',
    image_path: 'broker-card.png',
    updated_at: '2026-10-01T10:00:00Z',
  },
  {
    id: makeId(),
    name: 'Appraisal follow-up',
    content: APPRAISAL_CONTENT,
    statuses: ['market_appraisal'],
    is_default: false,
    image_url: null,
    image_path: null,
    updated_at: '2026-10-02T10:00:00Z',
  },
  {
    id: makeId(),
    name: 'For Sale update',
    content: FORSALE_CONTENT,
    statuses: ['for_sale_available'],
    is_default: false,
    image_url: null,
    image_path: null,
    updated_at: '2026-10-03T10:00:00Z',
  },
];

export default function TemplatesScene() {
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);

  const onSave = useCallback(async ({ id, name, content, statuses, isDefault, imageFile, removeImage }) => {
    const now = new Date().toISOString();
    let imageUrl = null;
    let imagePath = null;

    // If there's a new image file, create a local URL
    if (imageFile) {
      imageUrl = URL.createObjectURL(imageFile);
      imagePath = imageFile.name;
    }

    if (id) {
      // Update existing
      setTemplates((prev) => prev.map((t) => {
        if (t.id !== id) return {
          ...t,
          statuses:t.statuses.filter(status=>!statuses.includes(status)),
          is_default:isDefault?false:t.is_default,
        };
        return {
          ...t,
          name,
          content,
          statuses,
          is_default: isDefault,
          image_url: removeImage ? null : (imageUrl || t.image_url),
          image_path: removeImage ? null : (imagePath || t.image_path),
          updated_at: now,
        };
      }));
      const existing = templates.find((t) => t.id === id);
      return {
        ...existing,
        name,
        content,
        statuses,
        image_url: removeImage ? null : (imageUrl || existing?.image_url),
        image_path: removeImage ? null : (imagePath || existing?.image_path),
        updated_at: now,
      };
    }

    // Create new
    const newTemplate = {
      id: makeId(),
      name,
      content,
      statuses,
      is_default: false,
      image_url: imageUrl,
      image_path: imagePath,
      updated_at: now,
    };
    setTemplates((prev) => [...prev.map(t=>({...t,statuses:t.statuses.filter(status=>!statuses.includes(status))})), newTemplate]);
    return newTemplate;
  }, [templates]);

  const onSetDefault = useCallback(async (templateId) => {
    setTemplates((prev) => prev.map((t) => ({
      ...t,
      is_default: t.id === templateId,
    })));
  }, []);

  const onDelete = useCallback(async (templateId) => {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  }, []);

  const onClose = useCallback(() => {
    // In film mode, closing does nothing — the panel stays visible
  }, []);

  // Expose state for capture assertions
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, '__filmTemplateState', {
      get: () => ({
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          statuses: t.statuses,
          is_default: t.is_default,
          hasImage: Boolean(t.image_url),
        })),
        count: templates.length,
      }),
      configurable: true,
    });
  }

  return (
    <div style={{ background: '#111', minHeight: '100vh' }}>
      <MessageTemplatesPanel
        userId="film-user"
        loading={false}
        saving={false}
        templates={templates}
        onClose={onClose}
        onSave={onSave}
        onSetDefault={onSetDefault}
        onDelete={onDelete}
      />
    </div>
  );
}
