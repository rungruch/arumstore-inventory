# ProtectedRoute Usage Examples

The `ProtectedRoute` component now supports both single and multiple permission checks.

## Single Permission (Original Usage)

```tsx
// Requires only 'view' permission (default)
<ProtectedRoute module="users">
  <UsersList />
</ProtectedRoute>

// Requires specific single action
<ProtectedRoute module="users" action="edit">
  <EditUser />
</ProtectedRoute>

<ProtectedRoute module="products" action="create">
  <CreateProduct />
</ProtectedRoute>
```

## Multiple Permissions - AND Logic (All Required)

```tsx
// User must have BOTH 'view' AND 'edit' permissions
<ProtectedRoute module="settings" actions={["view", "edit"]} requireAll={true}>
  <SettingsPage />
</ProtectedRoute>

// User must have ALL three permissions
<ProtectedRoute module="users" actions={["view", "edit", "delete"]} requireAll={true}>
  <UserManagement />
</ProtectedRoute>
```

## Multiple Permissions - OR Logic (Any Required)

```tsx
// User needs EITHER 'edit' OR 'delete' permission
<ProtectedRoute module="users" actions={["edit", "delete"]} requireAll={false}>
  <UserActions />
</ProtectedRoute>

// User needs ANY of these permissions to access admin features
<ProtectedRoute module="admin" actions={["view", "edit", "create", "delete"]} requireAll={false}>
  <AdminPanel />
</ProtectedRoute>
```

## Common Use Cases

### Settings Pages
Settings pages typically need both view and edit permissions since they display sensitive information AND allow modifications:

```tsx
<ProtectedRoute module="settings" actions={["view", "edit"]} requireAll={true}>
  <CompanySettings />
</ProtectedRoute>
```

### User Management
User edit pages might need multiple permissions:

```tsx
<ProtectedRoute module="users" actions={["view", "edit"]} requireAll={true}>
  <EditUserPage />
</ProtectedRoute>
```

### Admin Panels
Admin panels might allow access if user has any admin permission:

```tsx
<ProtectedRoute module="admin" actions={["view", "edit", "create", "delete"]} requireAll={false}>
  <AdminDashboard />
</ProtectedRoute>
```

### Reports with Export
Pages that show reports but also allow exporting:

```tsx
<ProtectedRoute module="reports" actions={["view", "export"]} requireAll={true}>
  <ReportsPage />
</ProtectedRoute>
```

## Interface Definition

```tsx
interface ProtectedRouteProps {
  children: ReactNode;
  module?: keyof User['permissions'];
  action?: keyof User['permissions'][keyof User['permissions']];
  actions?: (keyof User['permissions'][keyof User['permissions']])[];
  requireAll?: boolean; // If true, requires ALL actions. If false, requires ANY action. Default: true
}
```

## Notes

- `requireAll` defaults to `true` (AND logic)
- When using `actions`, the `action` prop is ignored
- All existing single-permission usage continues to work unchanged
- The component maintains backward compatibility
