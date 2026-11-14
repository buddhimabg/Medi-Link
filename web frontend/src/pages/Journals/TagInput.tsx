import React, { useState } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  className?: string
  tagClassName?: string
  removeClassName?: string
}

// Simple, dependency-free tag input: type a tag, press Enter or comma to add it.
const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'Type a tag and press Enter...',
  className,
  tagClassName,
  removeClassName,
}) => {
  const [draft, setDraft] = useState('')

  const addTag = () => {
    const value = draft.trim().replace(/,$/, '')
    if (value && !tags.includes(value)) {
      onChange([...tags, value])
    }
    setDraft('')
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: tags.length ? 8 : 0 }}>
        {tags.map(tag => (
          <span key={tag} className={tagClassName} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {tag}
            <button
              type="button"
              className={removeClassName}
              onClick={() => removeTag(tag)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, lineHeight: 1 }}
              aria-label={`Remove ${tag}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <input
        className={className}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={placeholder}
      />
    </div>
  )
}

export default TagInput
