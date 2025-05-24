# Admin User Tracking System

## Overview

The Admin User Tracking System provides comprehensive monitoring and analytics capabilities for user activities within the application. This system is designed for administrators to monitor user behavior, track system usage, and gain insights into user engagement patterns.

## Features

### 1. User Activity Analytics Dashboard
- **Real-time Metrics**: Total activities, unique users, average session duration, and peak usage hours
- **Activity Distribution**: Visual breakdown of activity types using pie charts
- **Hourly Activity Patterns**: Bar chart showing user activity patterns throughout the day
- **User Growth Trends**: Line chart displaying daily active users over the last 7 days

### 2. User Summary View
- **User Overview**: Comprehensive list of all users with activity summaries
- **Activity Counts**: Login sessions, page views, and user interactions per user
- **Last Activity Tracking**: When each user was last active with relative time display
- **User Identification**: Display names and email addresses for easy user identification

### 3. Detailed Activity Logs
- **Comprehensive Logging**: Detailed view of all user activities with timestamps
- **Activity Types**: Login/logout, page visits, clicks, keyboard interactions, and more
- **Metadata Access**: Expandable details showing page paths, user agents, and interaction context
- **Real-time Updates**: Live activity feed with the most recent activities first

### 4. Advanced Filtering
- **User-specific Filtering**: View activities for specific users
- **Activity Type Filtering**: Filter by login, page views, interactions, etc.
- **Date Range Selection**: Custom date ranges for historical analysis
- **Multi-criteria Filtering**: Combine multiple filters for precise data analysis

## Access Control

The user tracking system is protected by the existing permission system:
- **Required Permission**: `users.view`
- **Target Users**: Administrators and managers with user management privileges
- **Navigation**: Available under "Admin" → "การติดตามผู้ใช้" in the main navigation

## URL Structure

- **Main Page**: `/admin/user-tracking`
- **Menu Location**: Admin section in the main navigation sidebar
- **Permission Check**: Automatically enforced through ProtectedRoute component

## Data Sources

The system reads from the `activity_logs` Firestore collection which tracks:
- User authentication events (login/logout)
- Page navigation and mounting
- User interactions (clicks, keyboard input)
- Session state changes
- Custom application events

## Performance Considerations

- **Query Limits**: Maximum 500 recent activities for detailed view, 10,000 for analytics
- **Client-side Filtering**: Date range filtering performed client-side for better responsiveness
- **Optimized Queries**: Firestore queries optimized with proper indexing on timestamp field
- **Lazy Loading**: Analytics components load data independently for better user experience

## Security Features

- **Permission-based Access**: Only users with appropriate permissions can access tracking data
- **User Privacy**: No sensitive personal data is logged beyond display names and emails
- **Audit Trail**: All access to user tracking is logged through the same activity tracking system
- **Data Retention**: Activity logs can be managed through Firestore retention policies

## Analytics Metrics

### Core Metrics
- **Total Activities**: Count of all logged activities in the selected time range
- **Unique Users**: Number of distinct users who performed activities
- **Average Session Duration**: Calculated time between first and last activity per user session
- **Peak Usage Hour**: Hour of the day with the highest activity count

### Activity Types Tracked
- `login`: User authentication success
- `logout`: User logout events
- `page_mount`: Page navigation and component mounting
- `click_interaction`: User interface interactions
- `keyboard_interaction`: Text input and form interactions
- `visibility_change`: Browser tab/window focus changes
- `auth_state_change`: Authentication state transitions

## Usage Instructions

### For Administrators

1. **Access the System**
   - Navigate to "Admin" in the main menu
   - Click "การติดตามผู้ใช้" (User Tracking)

2. **View Analytics Dashboard**
   - Click "วิเคราะห์" (Analytics) tab for comprehensive metrics
   - Review summary cards for key performance indicators
   - Examine charts for usage patterns and trends

3. **Monitor User Activity**
   - Use "ภาพรวม" (Summary) tab for user-specific overviews
   - Switch to "รายละเอียด" (Detailed) tab for granular activity logs

4. **Apply Filters**
   - Select specific users from the dropdown
   - Choose activity types to focus on specific behaviors
   - Set date ranges for historical analysis

### For System Administrators

The tracking system integrates with the existing activity logging infrastructure:
- Activity tracking is automatic and requires no manual intervention
- Data is stored efficiently in Firestore with proper indexing
- System performance impact is minimal due to throttling mechanisms

## Technical Implementation

### Components
- **Main Page**: `/app/admin/user-tracking/page.tsx`
- **Analytics Dashboard**: `/components/UserAnalyticsDashboard.tsx`
- **Permission Integration**: Uses existing ProtectedRoute system
- **Navigation Integration**: Added to menu-list.ts with proper permissions

### Dependencies
- **Firestore**: For activity log data storage and retrieval
- **Recharts**: For data visualization (charts and graphs)
- **Lucide React**: For UI icons and indicators
- **Existing Auth System**: For permission checking and user context

## Future Enhancements

Potential improvements that could be implemented:
- **Export Functionality**: CSV/PDF export of activity reports
- **Real-time Dashboard**: WebSocket-based live activity monitoring
- **Advanced Analytics**: User journey mapping and conversion funnels
- **Alerting System**: Notifications for unusual activity patterns
- **Performance Metrics**: Page load times and user experience tracking
- **Geographic Analysis**: User location-based activity insights

## Troubleshooting

### Common Issues
1. **No Data Displayed**: Check date range and ensure activity logging is enabled
2. **Permission Denied**: Verify user has `users.view` permission
3. **Slow Loading**: Adjust date range to reduce data volume
4. **Missing Users**: Ensure activity logs contain proper user identification

### Performance Optimization
- Use shorter date ranges for better performance
- Consider implementing server-side filtering for large datasets
- Monitor Firestore read costs and implement pagination if needed
- Cache analytics data for frequently accessed time ranges

This system provides a comprehensive foundation for user activity monitoring while maintaining security, performance, and usability standards.
