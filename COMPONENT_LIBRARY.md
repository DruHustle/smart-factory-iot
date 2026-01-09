# Component Library - Smart Factory IoT Dashboard

**Version:** 2.0.0
**Author:** Andrew Gotora
**Email:** andrewgotora@yahoo.com

## Overview

This document describes the reusable UI components available in the Smart Factory IoT Dashboard. All components follow the IMSOP design system and are built with React and TypeScript.

## Core Components

### Layout Components

#### DashboardLayout
The main layout wrapper for all pages. Provides sidebar navigation, header, and main content area.

**Props:**
- `children: React.ReactNode` - Page content

**Features:**
- Collapsible sidebar with resizable width
- User profile dropdown in footer
- Responsive mobile menu
- Dark theme by default

**Usage:**
```tsx
<DashboardLayout>
  <YourPageContent />
</DashboardLayout>
```

#### Sidebar
Navigation sidebar with collapsible menu items.

**Features:**
- Icon-based menu items
- Active state highlighting
- Collapsible/expandable states
- Responsive behavior on mobile

### UI Components

#### Button
Primary interactive button component with multiple variants.

**Variants:**
- `default` - Primary button
- `secondary` - Secondary button
- `destructive` - Danger action button
- `outline` - Outlined button
- `ghost` - Ghost button (minimal styling)
- `link` - Link-styled button

**Sizes:**
- `sm` - Small button
- `md` - Medium button (default)
- `lg` - Large button
- `xl` - Extra large button

**Usage:**
```tsx
<Button variant="default" size="lg">
  Click me
</Button>
```

#### Card
Container component for grouping related content.

**Subcomponents:**
- `Card` - Main container
- `CardHeader` - Header section
- `CardTitle` - Title text
- `CardDescription` - Description text
- `CardContent` - Main content area
- `CardFooter` - Footer section

**Usage:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Device Status</CardTitle>
    <CardDescription>Real-time device information</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

#### Badge
Small label component for status indicators and tags.

**Variants:**
- `default` - Default badge
- `secondary` - Secondary badge
- `destructive` - Destructive badge
- `outline` - Outlined badge

**Usage:**
```tsx
<Badge variant="default">Online</Badge>
<Badge variant="destructive">Critical</Badge>
```

#### Alert
Alert message component for notifications.

**Variants:**
- `default` - Default alert
- `destructive` - Error alert

**Usage:**
```tsx
<Alert>
  <AlertTitle>Alert Title</AlertTitle>
  <AlertDescription>Alert description text</AlertDescription>
</Alert>
```

#### Dialog
Modal dialog component for user interactions.

**Subcomponents:**
- `Dialog` - Container
- `DialogTrigger` - Trigger element
- `DialogContent` - Modal content
- `DialogHeader` - Header section
- `DialogTitle` - Title text
- `DialogDescription` - Description text
- `DialogFooter` - Footer section

**Usage:**
```tsx
<Dialog>
  <DialogTrigger>Open Dialog</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

#### Input
Text input field component.

**Props:**
- `type` - Input type (text, email, password, etc.)
- `placeholder` - Placeholder text
- `disabled` - Disabled state
- `required` - Required field indicator

**Usage:**
```tsx
<Input
  type="text"
  placeholder="Enter device name"
  disabled={false}
/>
```

#### Select
Dropdown select component.

**Subcomponents:**
- `Select` - Container
- `SelectTrigger` - Trigger button
- `SelectValue` - Selected value display
- `SelectContent` - Dropdown content
- `SelectItem` - Individual option
- `SelectGroup` - Option group

**Usage:**
```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select device" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="device1">Device 1</SelectItem>
    <SelectItem value="device2">Device 2</SelectItem>
  </SelectContent>
</Select>
```

#### Checkbox
Checkbox input component.

**Props:**
- `checked` - Checked state
- `disabled` - Disabled state
- `onCheckedChange` - Change handler

**Usage:**
```tsx
<Checkbox
  checked={isSelected}
  onCheckedChange={setIsSelected}
/>
```

#### Radio
Radio button component.

**Props:**
- `value` - Radio value
- `checked` - Checked state
- `disabled` - Disabled state

**Usage:**
```tsx
<RadioGroup value={selected} onValueChange={setSelected}>
  <Radio value="option1" />
  <Radio value="option2" />
</RadioGroup>
```

#### Tabs
Tabbed interface component.

**Subcomponents:**
- `Tabs` - Container
- `TabsList` - Tab buttons container
- `TabsTrigger` - Individual tab button
- `TabsContent` - Tab content

**Usage:**
```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

#### Tooltip
Tooltip component for additional information on hover.

**Props:**
- `content` - Tooltip content
- `side` - Tooltip position (top, right, bottom, left)
- `delayMs` - Delay before showing tooltip

**Usage:**
```tsx
<Tooltip content="Help text">
  <Button>Hover me</Button>
</Tooltip>
```

#### Popover
Popover component for contextual information.

**Subcomponents:**
- `Popover` - Container
- `PopoverTrigger` - Trigger element
- `PopoverContent` - Popover content

**Usage:**
```tsx
<Popover>
  <PopoverTrigger>Open Popover</PopoverTrigger>
  <PopoverContent>Popover content</PopoverContent>
</Popover>
```

#### Dropdown Menu
Dropdown menu component.

**Subcomponents:**
- `DropdownMenu` - Container
- `DropdownMenuTrigger` - Trigger button
- `DropdownMenuContent` - Menu content
- `DropdownMenuItem` - Menu item
- `DropdownMenuSeparator` - Divider
- `DropdownMenuLabel` - Label text

**Usage:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Option 1</DropdownMenuItem>
    <DropdownMenuItem>Option 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### Progress
Progress bar component.

**Props:**
- `value` - Progress percentage (0-100)
- `max` - Maximum value (default: 100)

**Usage:**
```tsx
<Progress value={65} />
```

#### Slider
Slider input component.

**Props:**
- `value` - Current value
- `min` - Minimum value
- `max` - Maximum value
- `step` - Step size
- `onValueChange` - Change handler

**Usage:**
```tsx
<Slider
  value={[value]}
  min={0}
  max={100}
  step={1}
  onValueChange={([newValue]) => setValue(newValue)}
/>
```

### Data Display Components

#### Chart
Chart component for data visualization using Recharts.

**Types:**
- Line Chart
- Bar Chart
- Area Chart
- Pie Chart
- Scatter Chart

**Usage:**
```tsx
<LineChart data={data}>
  <CartesianGrid />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="value" stroke="var(--chart-1)" />
</LineChart>
```

#### Table
Table component for displaying tabular data.

**Subcomponents:**
- `Table` - Container
- `TableHeader` - Header row
- `TableBody` - Body rows
- `TableRow` - Individual row
- `TableHead` - Header cell
- `TableCell` - Data cell
- `TableFooter` - Footer row

**Usage:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
      <TableHead>Column 2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data 1</TableCell>
      <TableCell>Data 2</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### Skeleton
Loading skeleton component.

**Usage:**
```tsx
<Skeleton className="h-12 w-12 rounded-full" />
<Skeleton className="h-4 w-full" />
```

## Custom Components

### StatusBadge
Custom component for displaying device status.

**Props:**
- `status` - Device status (online, offline, maintenance, error)
- `className` - Additional CSS classes

**Usage:**
```tsx
<StatusBadge status="online" />
```

### AlertCard
Custom component for displaying alert information.

**Props:**
- `alert` - Alert object
- `onAcknowledge` - Acknowledge handler
- `onResolve` - Resolve handler

**Usage:**
```tsx
<AlertCard
  alert={alertData}
  onAcknowledge={() => handleAcknowledge(alert.id)}
  onResolve={() => handleResolve(alert.id)}
/>
```

### DeviceCard
Custom component for displaying device information.

**Props:**
- `device` - Device object
- `onClick` - Click handler
- `selected` - Selected state

**Usage:**
```tsx
<DeviceCard
  device={deviceData}
  onClick={() => navigateToDevice(device.id)}
  selected={selectedDeviceId === device.id}
/>
```

## Styling Patterns

### Using Tailwind Classes

All components support Tailwind CSS classes for customization:

```tsx
<Button className="w-full md:w-auto">
  Custom Button
</Button>
```

### Using CSS Variables

Components automatically use CSS variables for theming:

```tsx
<Card className="border-primary/20">
  Content with primary color border
</Card>
```

### Combining Components

Components can be combined for complex layouts:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Devices</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      {devices.map(device => (
        <DeviceCard key={device.id} device={device} />
      ))}
    </div>
  </CardContent>
</Card>
```

## Accessibility

All components follow accessibility best practices:

- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Color contrast compliance

## Performance Considerations

- Components use React.memo for optimization where appropriate
- Lazy loading for heavy components
- Efficient re-rendering with proper dependency management
- CSS-in-JS optimizations for dynamic styling
