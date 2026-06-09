# Adding Real-Time Events to Remaining Controllers

This guide shows exactly what to add to each remaining controller.

## Step 1: Import the Real-Time Service

Add this import at the top of each controller file:

```javascript
const { EVENTS, emitToAll, emitToUser, emitToAdmins, notifyDashboardUpdate } = require('../services/realtimeService');
```

## Step 2: Add Event Emissions

### userController.js

**After user creation:**
```javascript
const user = await createUser(userData);

// Add this:
emitToAll(EVENTS.USER_CREATED, user);
notifyDashboardUpdate();
```

**After user update:**
```javascript
const user = await updateUser(userId, updateData);

// Add this:
emitToAll(EVENTS.USER_UPDATED, user);
emitToUser(userId, EVENTS.USER_UPDATED, user);
notifyDashboardUpdate();
```

**After user deletion:**
```javascript
await deleteUser(userId);

// Add this:
emitToAll(EVENTS.USER_DELETED, { id: userId });
notifyDashboardUpdate();
```

### notificationController.js

**After notification creation:**
```javascript
const notification = await createNotification(notificationData);

// Add this:
emitToUser(notification.user_id, EVENTS.NOTIFICATION_CREATED, notification);
```

**After marking notification as read:**
```javascript
const notification = await markAsRead(notificationId);

// Add this:
emitToUser(notification.user_id, EVENTS.NOTIFICATION_READ, notification);
```

**After notification deletion:**
```javascript
const notification = await getNotificationById(notificationId);
await deleteNotification(notificationId);

// Add this:
emitToUser(notification.user_id, EVENTS.NOTIFICATION_DELETED, { id: notificationId });
```

### liveClassController.js

**After live class creation:**
```javascript
const liveClass = await createLiveClass(classData);

// Add this:
emitToAll(EVENTS.LIVE_CLASS_CREATED, liveClass);
notifyDashboardUpdate();
```

**After live class update:**
```javascript
const liveClass = await updateLiveClass(classId, updateData);

// Add this:
emitToAll(EVENTS.LIVE_CLASS_UPDATED, liveClass);
notifyDashboardUpdate();
```

**After live class deletion:**
```javascript
await deleteLiveClass(classId);

// Add this:
emitToAll(EVENTS.LIVE_CLASS_DELETED, { id: classId });
notifyDashboardUpdate();
```

**When class starts:**
```javascript
const liveClass = await startLiveClass(classId);

// Add this:
emitToAll(EVENTS.LIVE_CLASS_STARTED, liveClass);
```

**When class ends:**
```javascript
const liveClass = await endLiveClass(classId);

// Add this:
emitToAll(EVENTS.LIVE_CLASS_ENDED, liveClass);
```

### progressController.js

**After progress update:**
```javascript
const progress = await updateProgress(progressData);

// Add this:
emitToUser(progress.user_id, EVENTS.PROGRESS_UPDATED, progress);
notifyDashboardUpdate();
```

**After lesson completion:**
```javascript
const progress = await completeLes son(lessonId, userId);

// Add this:
emitToUser(userId, EVENTS.LESSON_COMPLETED, progress);
notifyDashboardUpdate();
```

### attendanceController.js

**After marking attendance:**
```javascript
const attendance = await markAttendance(attendanceData);

// Add this:
emitToAll(EVENTS.ATTENDANCE_MARKED, attendance);
notifyDashboardUpdate();
```

**After updating attendance:**
```javascript
const attendance = await updateAttendance(attendanceId, updateData);

// Add this:
emitToAll(EVENTS.ATTENDANCE_UPDATED, attendance);
notifyDashboardUpdate();
```

### paymentController.js

**After payment creation:**
```javascript
const payment = await createPayment(paymentData);

// Add this:
emitToUser(payment.user_id, EVENTS.PAYMENT_CREATED, payment);
emitToAdmins(EVENTS.PAYMENT_CREATED, payment);
notifyDashboardUpdate();
```

**After payment update (e.g., status change):**
```javascript
const payment = await updatePayment(paymentId, updateData);

// Add this:
emitToUser(payment.user_id, EVENTS.PAYMENT_UPDATED, payment);
emitToAdmins(EVENTS.PAYMENT_UPDATED, payment);
notifyDashboardUpdate();
```

### certificateController.js

**After certificate generation:**
```javascript
const certificate = await generateCertificate(certificateData);

// Add this:
emitToUser(certificate.user_id, EVENTS.CERTIFICATE_GENERATED, certificate);
```

### categoryController.js

**After category creation:**
```javascript
const category = await createCategory(categoryData);

// Add this:
emitToAll(EVENTS.CATEGORY_CREATED, category);
notifyDashboardUpdate();
```

**After category update:**
```javascript
const category = await updateCategory(categoryId, updateData);

// Add this:
emitToAll(EVENTS.CATEGORY_UPDATED, category);
notifyDashboardUpdate();
```

**After category deletion:**
```javascript
await deleteCategory(categoryId);

// Add this:
emitToAll(EVENTS.CATEGORY_DELETED, { id: categoryId });
notifyDashboardUpdate();
```

### courseMaterialController.js

**After material upload/creation:**
```javascript
const material = await createMaterial(materialData);

// Add this:
emitToAll(EVENTS.MATERIAL_CREATED, material);
notifyDashboardUpdate();
```

**After material update:**
```javascript
const material = await updateMaterial(materialId, updateData);

// Add this:
emitToAll(EVENTS.MATERIAL_UPDATED, material);
notifyDashboardUpdate();
```

**After material deletion:**
```javascript
await deleteMaterial(materialId);

// Add this:
emitToAll(EVENTS.MATERIAL_DELETED, { id: materialId });
notifyDashboardUpdate();
```

### trialRequestController.js

**After trial request creation:**
```javascript
const request = await createTrialRequest(requestData);

// Add this:
emitToAdmins(EVENTS.TRIAL_REQUEST_CREATED, request);
notifyDashboardUpdate('admin');
```

**After trial request update (e.g., approval/rejection):**
```javascript
const request = await updateTrialRequest(requestId, updateData);

// Add this:
emitToAdmins(EVENTS.TRIAL_REQUEST_UPDATED, request);
if (request.user_id) {
  emitToUser(request.user_id, EVENTS.TRIAL_REQUEST_UPDATED, request);
}
notifyDashboardUpdate('admin');
```

## Quick Reference

### When to use each emit function:

- **`emitToAll(event, data)`**: When all users should see the update (courses, assignments, quizzes, etc.)
- **`emitToUser(userId, event, data)`**: When only a specific user should see it (grades, notifications, certificates)
- **`emitToAdmins(event, data)`**: When only admins should see it (trial requests, admin-specific data)
- **`notifyDashboardUpdate()`**: Call after any operation that should refresh dashboard statistics

### Event Naming Pattern:

```
RESOURCE_ACTION

Examples:
- COURSE_CREATED
- ASSIGNMENT_UPDATED
- QUIZ_DELETED
- USER_STATUS_CHANGED
```

## Implementation Checklist

- [ ] userController.js
- [ ] notificationController.js
- [ ] liveClassController.js
- [ ] progressController.js
- [ ] attendanceController.js
- [ ] paymentController.js
- [ ] certificateController.js
- [ ] categoryController.js
- [ ] courseMaterialController.js
- [ ] trialRequestController.js

## Testing

After adding events to each controller:

1. Start the backend: `npm run dev`
2. Check console for socket connection logs
3. Perform an action (e.g., create a course)
4. Verify the event is emitted in backend logs: `[realtime] Emitted course:created to all clients`
5. Check frontend receives the event in browser console: `[Socket] Subscribed to course:created`

## Common Issues

1. **Events not received**: Check CORS settings in `backend/src/server.js`
2. **Socket not connecting**: Verify `NEXT_PUBLIC_API_URL` in frontend `.env.local`
3. **Events received but not updating UI**: Ensure proper state updates in event handlers
4. **Memory leaks**: Always unsubscribe in useEffect cleanup functions
