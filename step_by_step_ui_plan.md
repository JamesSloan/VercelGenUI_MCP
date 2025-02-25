# Step-by-Step UI Response Plan

## Overview
Implement a UI that shows intermediate steps of the AI's response process, with a clear visual hierarchy between thinking states, intermediate steps, and final responses. Intermediate steps will be collapsible and visually subdued.

## Implementation Steps

### 1. Message Type Enhancement
- Add new message types to differentiate between steps and final response
- Update Message interface:
  ```typescript
  interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    toolCalls?: { name: string; args: string; }[];
    state?: 'thinking' | 'intermediate' | 'final';  // Track message state
    stepNumber?: number;  // Track step sequence
    isCollapsed?: boolean;  // Collapse state for steps list
  }
  ```

### 2. Server-Side Changes (actions.ts)
- Modify stream updates to include step information:
  - Add step number to each update
  - Mark updates as intermediate
  - Mark final update
- Structure:
  ```typescript
  // For intermediate steps
  stream.update(JSON.stringify({
    content: stepContent,
    toolCalls: currentToolCalls,
    state: 'intermediate',
    stepNumber: steps.length,
  }));

  // For final response
  stream.update(JSON.stringify({
    content: finalContent,
    toolCalls: allToolCalls,
    state: 'final',
  }));
  ```

### 3. UI Component Structure
```typescript
interface ResponseContainerProps {
  thinking: boolean;
  finalResponse?: string;
  steps: {
    content: string;
    toolCalls?: { name: string; args: string; }[];
    stepNumber: number;
  }[];
  isCollapsed: boolean;
}
```

### 4. Visual Components
1. Thinking State:
   - Prominent "Thinking..." message with animated ellipsis
   - Subtle background color (e.g., light gray)
   - Loading indicator animation

2. Steps List (Collapsible):
   - Positioned below thinking/final response
   - Subdued color scheme (lighter grays, smaller text)
   - Expandable/collapsible with arrow indicator
   - Each step shows:
     - Tool icon/name
     - Brief summary of action
     - Result preview

3. Final Response:
   - Replaces thinking state
   - Full message styling (current assistant message style)
   - Tool usage summary in collapsible section below

### 5. Component Hierarchy
```tsx
<ResponseContainer>
  {thinking ? (
    <ThinkingIndicator />
  ) : (
    <FinalResponse content={finalContent} />
  )}
  <CollapsibleStepsList
    steps={steps}
    isCollapsed={isCollapsed}
    onToggle={handleToggle}
  />
</ResponseContainer>
```

### 6. Styling Specifications
- Thinking State:
  ```css
  .thinking {
    background: var(--gray-50);
    padding: 1rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  ```

- Steps List:
  ```css
  .steps-list {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--gray-600);
    border-left: 2px solid var(--gray-200);
    margin-left: 1rem;
  }
  ```

- Transitions:
  ```css
  .collapse-transition {
    transition: height 150ms ease-in-out;
    overflow: hidden;
  }
  ```

## Implementation Order
1. Create basic component structure
2. Implement thinking state with animation
3. Add collapsible steps list
4. Style intermediate steps
5. Add final response transition
6. Polish animations and interactions

## Testing Scenarios
1. Single tool call flow
2. Multiple tool call sequence
3. Quick vs. slow responses
4. Error states
5. Collapse/expand interactions
6. Mobile responsiveness

## Future Enhancements
- Add step execution time indicators
- Implement step retry functionality
- Add progress indicator for multi-step responses
- Save step history for debugging
- Add keyboard shortcuts for collapse/expand
- Implement step filtering options 