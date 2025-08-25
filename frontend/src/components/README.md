# Custom Agent Builder Component

The Custom Agent Builder is a comprehensive React component that allows users to create, configure, and preview AI-powered financial assistants within the FinHelm.ai platform.

## Features

- **Low-Code Form Interface**: Intuitive form with validation for creating custom AI agents
- **Real-time Preview**: Integration with Grok API for live testing of agent responses
- **Multiple AI Models**: Support for GPT-4, Claude, and Grok models
- **Financial Scenarios**: Pre-built test scenarios for financial use cases
- **Form Validation**: Comprehensive client-side validation with error handling
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation
- **Responsive Design**: Optimized for desktop and mobile viewing

## Usage

### Basic Usage

```tsx
import { CustomAgentBuilder } from './components/CustomAgentBuilder';

function MyPage() {
  const handleSubmit = async (data) => {
    // Handle agent creation
    console.log('Creating agent:', data);
  };

  return (
    <CustomAgentBuilder
      organizationId="org-123"
      userId="user-456"
      onSubmit={handleSubmit}
    />
  );
}
```

### With Initial Data

```tsx
const initialData = {
  name: 'Financial Email Assistant',
  description: 'Helps rewrite financial documents as professional emails',
  model: 'gpt-4',
  language: 'english',
  category: 'financial_intelligence',
  temperature: 0.7,
  maxTokens: 1000,
  prompt: 'You are a professional financial assistant...',
};

<CustomAgentBuilder
  organizationId="org-123"
  userId="user-456"
  initialData={initialData}
  onSubmit={handleSubmit}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSubmit` | `(data: CustomAgentFormData) => Promise<void>` | No | Callback function called when the form is submitted |
| `initialData` | `Partial<CustomAgentFormData>` | No | Initial values for the form fields |
| `isLoading` | `boolean` | No | Whether the form is in a loading state |
| `organizationId` | `string` | No | Organization ID for API calls and permissions |
| `userId` | `string` | No | User ID for API calls and audit logging |

## Form Schema

The component uses Zod for form validation with the following schema:

```typescript
interface CustomAgentFormData {
  name: string;              // 1-100 characters
  description: string;       // 1-500 characters
  model: AIModel;           // 'gpt-4' | 'gpt-4-turbo' | 'claude-3-sonnet' | etc.
  language: Language;       // 'english' | 'spanish' | 'french' | etc.
  prompt: string;           // 1-4000 characters
  category: AgentCategory;  // 'financial_intelligence' | 'custom' | etc.
  temperature: number;      // 0-2 (creativity level)
  maxTokens: number;       // 1-4000 (response length)
}
```

## API Integration

### Grok Preview Integration

The component integrates with the Grok API for real-time agent testing:

```typescript
// Automatic preview when form is valid
const previewResponse = await grokService.previewAgentResponse({
  prompt: formData.prompt,
  query: testQuery,
  model: formData.model,
  temperature: formData.temperature,
  maxTokens: formData.maxTokens,
  organizationId,
  userId,
});
```

### Health Monitoring

The component monitors API health and displays status:

- ✅ **Online**: API is accessible and functioning
- ⚠️ **Degraded**: Rate limits reached, reduced functionality
- ❌ **Offline**: API is unreachable

## Sample Financial Scenarios

The component includes pre-built test scenarios:

1. **Email Rewriting**: "Rewrite this expense report as a professional email to management"
2. **Transaction Categorization**: "Categorize this transaction: $2,500 payment to ABC Software Solutions"
3. **Variance Analysis**: "Analyze this monthly revenue variance and explain the key drivers"
4. **Cash Flow Forecasting**: "Generate a cash flow forecast summary for the next quarter"
5. **Executive Summaries**: "Create an executive summary of accounts payable aging analysis"

## Form Validation

### Client-Side Validation

- **Real-time validation** as user types
- **Character counting** for text fields
- **Format validation** for specific field types
- **Required field indicators** with visual feedback

### Validation Rules

| Field | Rules |
|-------|-------|
| Name | Required, 1-100 characters, unique within organization |
| Description | Required, 1-500 characters |
| Prompt | Required, 1-4000 characters |
| Temperature | Number between 0-2 |
| Max Tokens | Number between 1-4000 |

## Error Handling

The component handles various error scenarios:

### Form Validation Errors
```tsx
// Displays inline error messages
{errors.name && (
  <p className="text-sm text-red-600">
    {errors.name.message}
  </p>
)}
```

### API Errors
```tsx
// Shows API-specific error messages
{previewError && (
  <div className="bg-red-50 border border-red-200 rounded-lg">
    <h4>Preview Error</h4>
    <p>{previewError}</p>
  </div>
)}
```

### Network Errors
- Connection timeouts
- Rate limiting
- Service unavailability

## Accessibility

The component is built with accessibility in mind:

### WCAG Compliance
- **Semantic HTML**: Proper form structure and labeling
- **ARIA Labels**: Screen reader friendly descriptions
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: Meets WCAG AA standards
- **Focus Management**: Clear focus indicators

### Screen Reader Support
```tsx
<input
  {...register('name')}
  aria-describedby="name-error"
  aria-required="true"
  aria-invalid={errors.name ? 'true' : 'false'}
/>
```

## Styling

The component uses Tailwind CSS with custom utility classes:

### Design System Classes
- `btn-primary`: Primary action buttons
- `btn-secondary`: Secondary action buttons
- `input`: Standard input styling
- `card`: Content container styling

### Responsive Design
```css
/* Mobile-first approach */
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <!-- Form panel -->
  <!-- Preview panel -->
</div>
```

## Performance

### Optimization Features
- **Debounced API calls**: Prevents excessive API requests during typing
- **Memoized calculations**: Character counts and form state
- **Lazy loading**: Preview panel only renders when needed
- **Request cancellation**: Cancels previous requests when new ones start

### Bundle Size
The component is optimized for bundle size with:
- Tree-shaking friendly imports
- Conditional loading of preview functionality
- Minimal external dependencies

## Testing

### Unit Tests
```bash
npm test CustomAgentBuilder.test.tsx
```

### Integration Tests
```bash
npm test -- --testPathPattern="integration"
```

### Test Coverage
- Form rendering and validation
- User interactions and form submission
- API integration and error handling
- Accessibility compliance
- Loading states and error scenarios

## Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run type checking
npm run type-check
```

### Environment Variables
```env
# Optional: Grok API key for production integration
GROK_API_KEY=your_api_key_here

# Development mode uses mock responses
NODE_ENV=development
```

## Migration Guide

### From Legacy Agent Builder

If migrating from a previous agent builder implementation:

1. **Update Props**: New prop structure with `organizationId` and `userId`
2. **Form Schema**: Updated validation schema with new fields
3. **API Integration**: New Grok API integration replaces legacy preview
4. **Styling**: Migrated to Tailwind CSS from CSS modules

### Breaking Changes

- `onPreview` prop removed (now handled internally)
- `previewLoading` state removed (use `isLoading` from hook)
- Form data structure updated with new required fields

## Contributing

When contributing to this component:

1. **Follow TypeScript**: Ensure all props and functions are properly typed
2. **Add Tests**: Include unit tests for new functionality
3. **Update Documentation**: Keep this README current with changes
4. **Accessibility**: Ensure new features are accessible
5. **Performance**: Consider bundle size and runtime performance

## Related Components

- [`useGrokPreview`](../hooks/README.md#useGrokPreview): React hook for Grok API integration
- [`GrokService`](../services/README.md#GrokService): Service class for Grok API calls
- [`AgentTypes`](../types/README.md#AgentTypes): TypeScript type definitions

## License

This component is part of the FinHelm.ai platform and is proprietary software.