# PrimeReact Setup Guide

This document describes how to use PrimeReact components in the Dive Log App.

## Installation

PrimeReact and PrimeIcons are already installed:

```bash
npm install primereact primeicons
```

## Tech Stack

- **[PrimeReact](https://primereact.org/)** - Rich UI component library for React
- **[PrimeIcons](https://primereact.org/icons)** - Icon library for PrimeReact

## Setup

### 1. Import PrimeReact Theme

Add the PrimeReact theme CSS to your app layout or globals.css:

```typescript
// app/layout.tsx or app/globals.css
import "primereact/resources/themes/lara-light-blue/theme.css";  // Theme
import "primereact/resources/primereact.min.css";                // Core CSS
import "primeicons/primeicons.css";                              // Icons
```

Available themes:
- `lara-light-blue` - Modern light theme (default)
- `lara-dark-blue` - Modern dark theme
- `md-light-indigo` - Material Design light
- `md-dark-indigo` - Material Design dark
- Many more at [PrimeReact Themes](https://primereact.org/theming/)

### 2. Using PrimeReact Components

Here's how to use common PrimeReact components:

#### Button

```tsx
import { Button } from 'primereact/button';

function MyComponent() {
  return (
    <div>
      <Button label="Submit" icon="pi pi-check" />
      <Button label="Cancel" icon="pi pi-times" severity="secondary" />
    </div>
  );
}
```

#### DataTable

```tsx
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

function DivesList({ dives }) {
  return (
    <DataTable value={dives} paginator rows={10}>
      <Column field="diveNumber" header="Dive #" sortable />
      <Column field="location" header="Location" sortable />
      <Column field="maxDepth" header="Max Depth (m)" sortable />
      <Column field="duration" header="Duration (min)" sortable />
    </DataTable>
  );
}
```

#### Dialog

```tsx
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';

function MyComponent() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button label="Show Dialog" onClick={() => setVisible(true)} />
      <Dialog
        header="Dive Details"
        visible={visible}
        onHide={() => setVisible(false)}
        style={{ width: '50vw' }}
      >
        <p>Dive information goes here...</p>
      </Dialog>
    </>
  );
}
```

#### Calendar (Date Picker)

```tsx
import { Calendar } from 'primereact/calendar';

function DiveForm() {
  const [date, setDate] = useState(new Date());

  return (
    <Calendar
      value={date}
      onChange={(e) => setDate(e.value)}
      dateFormat="yy-mm-dd"
      showIcon
    />
  );
}
```

#### InputNumber

```tsx
import { InputNumber } from 'primereact/inputnumber';

function DiveForm() {
  const [depth, setDepth] = useState(20);

  return (
    <InputNumber
      value={depth}
      onValueChange={(e) => setDepth(e.value)}
      suffix=" m"
      min={0}
      step={0.5}
    />
  );
}
```

#### Dropdown

```tsx
import { Dropdown } from 'primereact/dropdown';

function DiveForm() {
  const [waterType, setWaterType] = useState('saltwater');

  const waterTypes = [
    { label: 'Saltwater', value: 'saltwater' },
    { label: 'Freshwater', value: 'freshwater' }
  ];

  return (
    <Dropdown
      value={waterType}
      onChange={(e) => setWaterType(e.value)}
      options={waterTypes}
      placeholder="Select Water Type"
    />
  );
}
```

## Integration with Dive Log App

### Example: Enhanced Dive Form

You can enhance the dive form with PrimeReact components:

```tsx
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';

export default function EnhancedDiveForm() {
  const [formData, setFormData] = useState({
    diveNumber: 1,
    diveDate: new Date(),
    maxDepth: 20,
    duration: 45,
    waterType: 'saltwater',
    notes: ''
  });

  return (
    <form className="p-fluid">
      <div className="field">
        <label htmlFor="diveNumber">Dive Number</label>
        <InputNumber
          id="diveNumber"
          value={formData.diveNumber}
          onValueChange={(e) => setFormData({...formData, diveNumber: e.value})}
          min={1}
        />
      </div>

      <div className="field">
        <label htmlFor="diveDate">Date</label>
        <Calendar
          id="diveDate"
          value={formData.diveDate}
          onChange={(e) => setFormData({...formData, diveDate: e.value})}
          dateFormat="yy-mm-dd"
          showIcon
        />
      </div>

      <div className="field">
        <label htmlFor="maxDepth">Max Depth (m)</label>
        <InputNumber
          id="maxDepth"
          value={formData.maxDepth}
          onValueChange={(e) => setFormData({...formData, maxDepth: e.value})}
          min={0}
          step={0.5}
        />
      </div>

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <InputTextarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          rows={4}
        />
      </div>

      <Button label="Log Dive" icon="pi pi-check" type="submit" />
    </form>
  );
}
```

### Example: Dives List with DataTable

```tsx
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';

export default function DivesList({ dives }) {
  const actionTemplate = (rowData) => {
    return (
      <div>
        <Button
          icon="pi pi-pencil"
          className="p-button-rounded p-button-text"
          onClick={() => editDive(rowData)}
        />
        <Button
          icon="pi pi-trash"
          className="p-button-rounded p-button-text p-button-danger"
          onClick={() => deleteDive(rowData)}
        />
      </div>
    );
  };

  const dateTemplate = (rowData) => {
    return new Date(rowData.diveDate).toLocaleDateString();
  };

  return (
    <DataTable
      value={dives}
      paginator
      rows={10}
      filterDisplay="row"
      sortMode="multiple"
    >
      <Column field="diveNumber" header="Dive #" sortable filter />
      <Column field="diveDate" header="Date" body={dateTemplate} sortable />
      <Column field="location" header="Location" sortable filter />
      <Column field="maxDepth" header="Max Depth (m)" sortable />
      <Column field="duration" header="Duration (min)" sortable />
      <Column body={actionTemplate} header="Actions" />
    </DataTable>
  );
}
```

## Styling

PrimeReact uses its own class naming convention. You can combine it with Tailwind CSS:

```tsx
<div className="flex gap-4 p-4">
  <Button label="PrimeReact" className="p-button-raised" />
  <button className="px-4 py-2 bg-blue-500 text-white rounded">Tailwind</button>
</div>
```

## Useful Components for Dive Log App

1. **DataTable** - List dives with sorting, filtering, pagination
2. **Calendar** - Date picker for dive date
3. **InputNumber** - Numeric inputs for depth, duration, temperature
4. **Dropdown** - Select water type, difficulty, etc.
5. **Dialog** - Modal dialogs for dive details, confirmations
6. **FileUpload** - Upload dive verification photos
7. **Chart** - Visualize dive statistics (depth over time, etc.)
8. **Timeline** - Show dive history timeline
9. **Card** - Display dive spot information
10. **Rating** - Rate dive spots

## Resources

- [PrimeReact Documentation](https://primereact.org/)
- [PrimeReact Components](https://primereact.org/installation/)
- [PrimeReact Templates](https://primereact.org/templates/)
- [PrimeReact Showcase](https://primereact.org/showcase/)

## Next.js 14 Considerations

PrimeReact components work with Next.js 14 App Router. Make sure to:

1. Use `"use client"` directive for pages/components using PrimeReact
2. Import theme CSS in the root layout
3. Use dynamic imports for heavy components if needed

```tsx
"use client";

import { Button } from 'primereact/button';
// Component code...
```
