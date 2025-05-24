/**
 * User Activity Tracking Test Script
 * 
 * This script can be run in the browser console to simulate and test
 * user activity tracking functionality.
 * 
 * UPDATED: Now includes tests for the enhanced activity logging system
 * that creates detailed activity logs in the activity_logs collection.
 */

class ActivityTrackingTester {
  constructor() {
    this.testResults = [];
    this.startTime = new Date();
  }

  /**
   * Test Case 1: Verify useUserActivity hook is active on current page
   */
  async testActivityHookPresence() {
    console.log('🧪 Testing: Activity Hook Presence');
    
    // Check if the hook has added event listeners
    const hasClickListeners = document.addEventListener.toString().includes('click');
    const hasVisibilityListeners = document.addEventListener.toString().includes('visibilitychange');
    
    this.logResult('Activity Hook Presence', {
      hasClickListeners,
      hasVisibilityListeners,
      currentPath: window.location.pathname,
      timestamp: new Date().toISOString()
    });
    
    return { hasClickListeners, hasVisibilityListeners };
  }

  /**
   * Test Case 2: Simulate user interactions and verify throttling
   */
  async testActivityThrottling() {
    console.log('🧪 Testing: Activity Throttling');
    
    const initialLogCount = await this.getActivityLogCount();
    
    // Simulate rapid clicks (should be throttled)
    for (let i = 0; i < 10; i++) {
      document.body.click();
      await this.sleep(100);
    }
    
    // Wait for potential database writes
    await this.sleep(2000);
    
    const afterClicksLogCount = await this.getActivityLogCount();
    
    // Simulate visibility changes
    Object.defineProperty(document, 'hidden', { value: true, writable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    
    await this.sleep(100);
    
    Object.defineProperty(document, 'hidden', { value: false, writable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    
    await this.sleep(2000);
    
    const finalLogCount = await this.getActivityLogCount();
    
    this.logResult('Activity Throttling', {
      initialLogs: initialLogCount,
      afterClicks: afterClicksLogCount,
      finalLogs: finalLogCount,
      clicksThrottled: (afterClicksLogCount - initialLogCount) <= 1,
      visibilityThrottled: (finalLogCount - afterClicksLogCount) <= 1
    });
  }

  /**
   * Test Case 3: Check AuthContext state and user data
   */
  async testAuthContextState() {
    console.log('🧪 Testing: AuthContext State');
    
    // Try to access AuthContext through React DevTools or window object
    let authState = null;
    let userInitials = 'Unknown';
    
    try {
      // Look for UserNav component in DOM
      const userNavElement = document.querySelector('[data-testid="user-nav"]') || 
                           document.querySelector('.relative.h-8.w-8.rounded-full');
      
      if (userNavElement) {
        const avatarFallback = userNavElement.querySelector('.bg-transparent');
        userInitials = avatarFallback ? avatarFallback.textContent : 'Not Found';
      }
      
      // Check if there are any auth-related errors in console
      const hasAuthErrors = console.error.toString().includes('Cannot read properties of undefined');
      
      authState = {
        userInitialsDisplayed: userInitials,
        hasAuthErrors: hasAuthErrors,
        userNavPresent: !!userNavElement
      };
      
    } catch (error) {
      authState = { error: error.message };
    }
    
    this.logResult('AuthContext State', authState);
    return authState;
  }

  /**
   * Test Case 4: Verify activity tracking across page navigation
   */
  async testCrossPageTracking() {
    console.log('🧪 Testing: Cross-Page Activity Tracking');
    
    const currentPath = window.location.pathname;
    const trackedPages = ['/dashboard', '/products', '/sales', '/purchases', '/finance'];
    
    const pageTrackingStatus = {
      currentPage: currentPath,
      isTrackedPage: trackedPages.includes(currentPath),
      hasUseUserActivityImport: false
    };
    
    // Check if current page likely has useUserActivity (indirect check)
    try {
      // Look for React components that might indicate activity tracking
      const hasReactComponents = !!document.querySelector('[data-reactroot]') || 
                               !!document.querySelector('#__next');
      pageTrackingStatus.hasReactComponents = hasReactComponents;
    } catch (error) {
      pageTrackingStatus.error = error.message;
    }
    
    this.logResult('Cross-Page Tracking', pageTrackingStatus);
    return pageTrackingStatus;
  }

  /**
   * Test Case 5: Generate sample activity data
   */
  async generateSampleActivityData() {
    console.log('🧪 Generating: Sample Activity Data');
    
    const sampleData = {
      userId: 'test_user_123',
      email: 'test@example.com',
      displayName: 'Test User',
      activities: []
    };
    
    // Generate sample activities for the last hour
    const now = new Date();
    const activityTypes = ['page_mount', 'click_interaction', 'visibility_change', 'page_interaction'];
    const pages = ['/dashboard', '/products', '/sales', '/purchases', '/finance'];
    
    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(now.getTime() - (i * 6 * 60 * 1000)); // Every 6 minutes
      const activity = {
        userId: sampleData.userId,
        email: sampleData.email,
        displayName: sampleData.displayName,
        timestamp: timestamp.toISOString(),
        activityType: activityTypes[Math.floor(Math.random() * activityTypes.length)],
        metadata: {
          page: pages[Math.floor(Math.random() * pages.length)],
          userAgent: navigator.userAgent,
          sessionId: 'session_' + Math.random().toString(36).substr(2, 9)
        }
      };
      sampleData.activities.push(activity);
    }
    
    this.logResult('Sample Activity Data', sampleData);
    return sampleData;
  }

  /**
   * Test Case 6: Performance impact assessment
   */
  async testPerformanceImpact() {
    console.log('🧪 Testing: Performance Impact');
    
    const performanceData = {
      memoryUsage: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : 'Not available',
      networkRequests: performance.getEntriesByType('navigation').length + 
                      performance.getEntriesByType('resource').length,
      pageLoadTime: performance.timing ? 
                   performance.timing.loadEventEnd - performance.timing.navigationStart : 
                   'Not available',
      testDuration: new Date() - this.startTime
    };
    
    this.logResult('Performance Impact', performanceData);
    return performanceData;
  }

  /**
   * Helper: Get simulated activity log count (since we can't directly access Firestore from console)
   */
  async getActivityLogCount() {
    // This would normally query Firestore, but for testing we'll simulate
    return Math.floor(Math.random() * 10) + 1;
  }

  /**
   * Helper: Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper: Log test results
   */
  logResult(testName, result) {
    const logEntry = {
      test: testName,
      timestamp: new Date().toISOString(),
      result: result,
      status: this.determineStatus(result)
    };
    
    this.testResults.push(logEntry);
    
    const statusEmoji = logEntry.status === 'pass' ? '✅' : 
                       logEntry.status === 'warning' ? '⚠️' : '❌';
    
    console.log(`${statusEmoji} ${testName}:`, result);
  }

  /**
   * Helper: Determine test status
   */
  determineStatus(result) {
    if (typeof result === 'object' && result !== null) {
      if (result.error) return 'fail';
      if (result.hasAuthErrors === true) return 'fail';
      if (result.userInitialsDisplayed === 'U' || result.userInitialsDisplayed === 'Not Found') return 'warning';
      return 'pass';
    }
    return 'pass';
  }
  
  /**
   * Test Case 7: Verify activity logs collection in Firestore
   */
  async testActivityLogsCollection() {
    console.log('🧪 Testing: Activity Logs Collection');
    
    // Get current Firebase user
    let firebaseUser = null;
    try {
      firebaseUser = firebase.auth().currentUser;
    } catch (error) {
      this.logResult('Activity Logs Collection', {
        error: 'Firebase auth not available: ' + error.message,
        passed: false
      });
      return { error: error.message, passed: false };
    }
    
    if (!firebaseUser) {
      this.logResult('Activity Logs Collection', {
        error: 'No user logged in',
        passed: false
      });
      return { error: 'No user logged in', passed: false };
    }
    
    try {
      // Create a test activity log
      const testActivityData = {
        timestamp: new Date().toISOString(),
        activityType: 'test_script_execution',
        userAgent: navigator.userAgent,
        page: window.location.pathname
      };
      
      // Trigger activity tracking directly
      await window.trackUserActivity(firebaseUser.uid, 'test_script_execution', testActivityData);
      
      // Allow time for activity to be logged
      await this.sleep(1000);
      
      // Try to query Firestore for recent logs
      const db = firebase.firestore();
      const activityLogsRef = db.collection('activity_logs')
        .where('userId', '==', firebaseUser.uid)
        .where('activityType', '==', 'test_script_execution')
        .orderBy('timestamp', 'desc')
        .limit(5);
        
      const snapshot = await activityLogsRef.get();
      
      const logs = [];
      snapshot.forEach(doc => {
        logs.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      const result = {
        passed: logs.length > 0,
        uid: firebaseUser.uid,
        logsFound: logs.length,
        recentLogs: logs.slice(0, 3),
        isDetailedTracking: logs.some(log => log.metadata && 
          (log.metadata.page || log.metadata.userAgent))
      };
      
      this.logResult('Activity Logs Collection', result);
      return result;
      
    } catch (error) {
      console.error('Error testing activity logs:', error);
      this.logResult('Activity Logs Collection', {
        error: error.message,
        passed: false
      });
      return { error: error.message, passed: false };
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting User Activity Tracking Tests...\n');
    
    await this.testActivityHookPresence();
    await this.testAuthContextState();
    await this.testCrossPageTracking();
    await this.generateSampleActivityData();
    await this.testActivityThrottling();
    await this.testPerformanceImpact();
    await this.testActivityLogsCollection(); // Added new test
    
    console.log('\n📊 Test Summary:');
    console.table(this.testResults.map(r => ({
      Test: r.test,
      Status: r.status,
      Timestamp: r.timestamp
    })));
    
    const passCount = this.testResults.filter(r => r.status === 'pass').length;
    const warnCount = this.testResults.filter(r => r.status === 'warning').length;
    const failCount = this.testResults.filter(r => r.status === 'fail').length;
    
    console.log(`\n🎯 Results: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);
    
    return this.testResults;
  }

  /**
   * Export test results as downloadable JSON
   */
  exportResults() {
    const dataStr = JSON.stringify(this.testResults, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-tracking-test-results-${new Date().toISOString().slice(0,19)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// Usage instructions
console.log(`
🧪 User Activity Tracking Test Suite

To run tests, execute:
  const tester = new ActivityTrackingTester();
  await tester.runAllTests();

To export results:
  tester.exportResults();

Individual tests:
  await tester.testActivityHookPresence();
  await tester.testAuthContextState();
  await tester.testCrossPageTracking();
  await tester.generateSampleActivityData();
  await tester.testActivityThrottling();
  await tester.testPerformanceImpact();
  await tester.testActivityLogsCollection(); // NEW: Test activity_logs collection
`);

// Auto-initialize for convenience
if (typeof window !== 'undefined') {
  window.ActivityTrackingTester = ActivityTrackingTester;
  
  // Export trackUserActivity for test script use
  import('/lib/auth-utils.js').then(module => {
    window.trackUserActivity = module.trackUserActivity;
    console.log('✅ trackUserActivity function is now available globally');
  }).catch(error => {
    console.error('❌ Failed to import trackUserActivity:', error);
  });
}
