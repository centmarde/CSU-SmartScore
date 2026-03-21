# Teacher QR Code Management

This module provides comprehensive QR code management functionality for teachers in the Quiz Checker application.

## Features

### QR Code CRUD Operations
- **Create**: Generate new QR codes with custom titles, descriptions, and table assignments
- **Read**: View all QR codes in a searchable data table with status indicators
- **Update**: Edit existing QR codes including title, description, table number, and status
- **Delete**: Remove QR codes with confirmation dialog

### QR Code Generation
- Uses the `qrcode` library to generate high-quality QR codes
- Downloadable PNG format with customizable size and appearance
- Automatic URL generation based on table numbers

### Database Integration
- Full Supabase integration with real-time updates
- Row-level security for data protection
- Automatic timestamping and user tracking

## Components

### TeacherQRView.vue
Main page component that serves as the container for the QR management interface.

**Route**: `/teacher/qr-codes`
**Layout**: Uses `InnerLayoutWrapper` for consistent admin interface styling

### TeacherQRWidget.vue
Core widget component containing all QR management functionality.

#### Features:
- **Dashboard Stats**: Display total, active, and inactive QR code counts
- **Data Table**: Searchable table with sorting and filtering
- **Modal Dialogs**: Create, edit, view, and delete operations
- **QR Preview**: Visual QR code display with download functionality
- **Status Management**: Quick toggle for active/inactive states

#### Props: None (uses Pinia store for state management)

## Store Integration

### useQR.ts
Pinia store providing centralized state management and API operations.

#### State:
```typescript
interface QRCode {
  id?: number;
  title: string;
  description?: string;
  qr_link: string;
  table_number: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}
```

#### Key Methods:
- `fetchQRCodes()`: Load all QR codes from database
- `createQRCode(data)`: Create new QR code
- `updateQRCode(id, updates)`: Update existing QR code
- `deleteQRCode(id)`: Delete QR code
- `toggleQRCodeStatus(id, isActive)`: Quick status toggle
- `generateTableLink(tableId)`: Generate quiz URL for table

## Database Schema

### qr_codes Table
```sql
CREATE TABLE qr_codes (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    qr_link TEXT NOT NULL,
    table_number INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
```

## Usage Examples

### Creating a QR Code
```typescript
const qrStore = useQrCodeStore();

await qrStore.createQRCode({
  title: 'Math Quiz Station 1',
  description: 'Basic algebra quiz for beginners',
  table_number: 1,
  qr_link: 'https://csu-smart-score.vercel.app/student/quiz?table=1',
  is_active: true
});
```

### Downloading QR Code
```typescript
// Component method
const downloadQRCode = async (qrCode: QRCode) => {
  const dataUri = await generateQRCodeImage(qrCode.qr_link);
  const link = document.createElement('a');
  link.download = `qr-code-${qrCode.title}.png`;
  link.href = dataUri;
  link.click();
};
```

## Styling

### Vuetify Components Used:
- `v-data-table`: For QR code listing
- `v-dialog`: For modal operations
- `v-form`: For input validation
- `v-card`: For layout and containers
- `v-chip`: For status indicators
- `v-btn`: For actions and navigation

### Custom Styles:
```scss
.cursor-pointer {
  cursor: pointer;
}

.word-break {
  word-break: break-all;
}
```

## Security Features

- **Authentication Required**: All routes protected by auth middleware
- **Row Level Security**: Users can only modify their own QR codes
- **Input Validation**: Client and server-side validation
- **Permission Checks**: Role-based access control

## Error Handling

- Toast notifications for success/error feedback
- Form validation with real-time feedback
- Loading states for async operations
- Graceful fallbacks for network issues

## Future Enhancements

- [ ] Bulk QR code generation
- [ ] QR code analytics and scan tracking
- [ ] Custom QR code styling options
- [ ] Export to PDF functionality
- [ ] Print-friendly layout
- [ ] QR code expiration dates
- [ ] Batch operations (activate/deactivate multiple)

## Dependencies

- `qrcode`: QR code generation library
- `@supabase/supabase-js`: Database client
- `vue-toastification`: Toast notifications
- `pinia`: State management
- `vuetify`: UI components
