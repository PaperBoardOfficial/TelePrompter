import React, { useState, useEffect } from 'react';
import { toast } from '@/renderer/components/common/toast';

// If you need to add shadcn components, you'll need to install them first
// For now, let's use basic HTML elements that will definitely work

export default function PromptTemplates() {
  const [templates, setTemplates] = useState<Record<string, any>>({});
  const [activeTemplate, setActiveTemplate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [nextTemplateId, setNextTemplateId] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

  // Load templates from electron store
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const result = await window.electronAPI.getPromptTemplates();

        // Check if we need to reset to the default templates
        const templates = result.templates || {};
        const templateKeys = Object.keys(templates);

        // If there are no templates or the templates don't include our built-in ones,
        // reset to defaults
        if (templateKeys.length === 0 ||
          (!templateKeys.includes('coding_task') && !templateKeys.includes('meeting_notes'))) {
          console.log("Resetting to default templates");
          const resetResult = await window.electronAPI.resetPromptTemplates();
          if (resetResult.success) {
            setTemplates(resetResult.templates || {});
            setActiveTemplate(resetResult.activeTemplate || 'coding_task');
          } else {
            setTemplates({});
            setActiveTemplate('');
          }
        } else {
          setTemplates(templates);
          setActiveTemplate(result.activeTemplate || 'coding_task');
        }

        // Calculate the next template ID based on existing custom templates
        const customIds = Object.keys(templates)
          .filter(key => key.startsWith('template_'))
          .map(key => parseInt(key.replace('template_', ''), 10))
          .filter(id => !isNaN(id));

        const maxId = customIds.length > 0 ? Math.max(...customIds) : 0;
        setNextTemplateId(maxId + 1);

        setLoading(false);
      } catch (error) {
        console.error("Error loading templates:", error);
        toast.error('Error', 'Failed to load prompt templates');
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  const handleSaveTemplates = async () => {
    try {
      const result = await window.electronAPI.savePromptTemplates({
        templates,
        activeTemplate
      });

      if (result.success) {
        toast.success('Success', 'Prompt templates saved successfully');
        setIsEditing(false);
        setEditingTemplate(null);
      } else {
        toast.error( result.error || 'Failed to save templates', 'error');
      }
    } catch (error) {
      toast.error('Error', 'Failed to save prompt templates');
    }
  };

  const handleAddTemplate = () => {
    const templateId = `template_${Date.now()}`;
    const newTemplates = {
      ...templates,
      [templateId]: {
        name: `Custom Template ${nextTemplateId}`,
        initialPrompt: "Analyze the image and extract all relevant information.",
        followUpPrompt: "Review the previous solution and improve it."
      }
    };

    setTemplates(newTemplates);
    setNextTemplateId(nextTemplateId + 1);
    setEditingTemplate(templateId);
    setIsEditing(true);

    if (Object.keys(templates).length === 0) {
      setActiveTemplate(templateId);
    }
  };

  const handleEditTemplate = (templateId: string) => {
    setEditingTemplate(templateId);
    setIsEditing(true);
  };

  const handleDeleteTemplate = (templateKey: string) => {
    // Create a copy of the templates object
    const updatedTemplates = { ...templates };

    // Delete the template
    delete updatedTemplates[templateKey];

    // Update the templates state
    setTemplates(updatedTemplates);

    // If the deleted template was the active one, set a new active template
    if (activeTemplate === templateKey) {
      // Set the first available template as active, or empty string if none left
      const firstAvailableTemplate = Object.keys(updatedTemplates)[0] || '';
      setActiveTemplate(firstAvailableTemplate);
    }

    // Close the edit modal if it was open for this template
    if (editingTemplate === templateKey) {
      setEditingTemplate('');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingTemplate(null);
  };

  if (loading) {
    return <div className="text-white">Loading templates...</div>;
  }

  // Edit/Add Template Screen
  if (isEditing && editingTemplate) {
    const isNewTemplate = !templates[editingTemplate]?.name;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">
            {isNewTemplate ? 'Add New Template' : 'Edit Template'}
          </h2>
          <button
            onClick={handleCancelEdit}
            className="text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="templateName" className="block text-white mb-1">Template Name</label>
            <input
              type="text"
              id="templateName"
              className="w-full p-2 border rounded bg-gray-700 text-white border-gray-600"
              value={templates[editingTemplate]?.name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplates({
                ...templates,
                [editingTemplate]: {
                  ...templates[editingTemplate],
                  name: e.target.value
                }
              })}
            />
          </div>

          <div>
            <label htmlFor="initialPrompt" className="block text-white mb-1">Initial Prompt</label>
            <textarea
              id="initialPrompt"
              rows={10}
              className="w-full p-2 border rounded font-mono text-sm bg-gray-700 text-white border-gray-600"
              value={templates[editingTemplate]?.initialPrompt || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTemplates({
                ...templates,
                [editingTemplate]: {
                  ...templates[editingTemplate],
                  initialPrompt: e.target.value
                }
              })}
            />
            <p className="text-xs text-gray-400 mt-1">
              This prompt will be used when processing screenshots for the first time.
            </p>
          </div>

          <div>
            <label htmlFor="followUpPrompt" className="block text-white mb-1">Follow-up Prompt</label>
            <textarea
              id="followUpPrompt"
              rows={10}
              className="w-full p-2 border rounded font-mono text-sm bg-gray-700 text-white border-gray-600"
              value={templates[editingTemplate]?.followUpPrompt || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTemplates({
                ...templates,
                [editingTemplate]: {
                  ...templates[editingTemplate],
                  followUpPrompt: e.target.value
                }
              })}
            />
            <p className="text-xs text-gray-400 mt-1">
              This prompt will be used when re-evaluating or debugging a previous response.
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleSaveTemplates}
          >
            Save Template
          </button>
          <button
            className="px-4 py-2 border border-gray-500 text-white rounded hover:bg-gray-700"
            onClick={handleCancelEdit}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Template List Screen
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">Prompt Templates</h2>
        <button
          className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm flex items-center"
          onClick={handleAddTemplate}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New
        </button>
      </div>

      <p className="text-sm text-gray-400">
        Configure templates for different use cases. The active template will be used when processing screenshots.
      </p>

      <div className="space-y-2">
        {/* List of all templates */}
        {Object.keys(templates).map(templateId => (
          <div
            key={templateId}
            className={`p-3 rounded-lg border transition-all ${activeTemplate === templateId
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-300 hover:border-blue-300'
              }`}
            onClick={() => {
              setActiveTemplate(templateId);
              // Save the active template immediately
              window.electronAPI.savePromptTemplates({
                templates,
                activeTemplate: templateId
              });
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-white">
                  {templates[templateId]?.name || `Template ${templateId}`}
                  {activeTemplate === templateId && (
                    <span className="ml-2 text-xs text-blue-400">(Active)</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {templateId === 'coding_task' || templateId === 'meeting_notes'
                    ? 'Built-in template'
                    : 'Custom template'}
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  className="text-gray-400 hover:text-white p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTemplate(templateId);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>

                <button
                  className="text-red-500 hover:text-red-400 p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTemplate(templateId);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 