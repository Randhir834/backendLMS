#!/usr/bin/env node

/**
 * Test Script for Review Moderation System
 * 
 * This script tests the complete review moderation flow:
 * 1. Submit a review (pending status)
 * 2. Verify it doesn't appear in public approved reviews
 * 3. Verify it appears in admin pending reviews
 * 4. Approve the review
 * 5. Verify it appears in public approved reviews
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5001/api';
let adminToken = '';
let testReviewId = null;

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

function step(message) {
  log(`\n➜ ${message}`, 'cyan');
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Submit a review
async function submitTestReview() {
  step('Test 1: Submit a test review');
  
  try {
    const reviewData = {
      name: 'Test Parent',
      role: 'Parent',
      rating: 5,
      message: 'This is an automated test review to verify the moderation system is working correctly. My child learned so much!',
      email: 'test@example.com',
      phone: '+1234567890',
      courseName: 'Test Course'
    };

    const response = await axios.post(`${API_BASE_URL}/reviews/submit`, reviewData);
    
    testReviewId = response.data.id;
    success(`Review submitted successfully! ID: ${testReviewId}`);
    info(`Message: ${response.data.message}`);
    return true;
  } catch (err) {
    error(`Failed to submit review: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// Test 2: Verify review is NOT in public approved list
async function verifyNotInPublicList() {
  step('Test 2: Verify review is NOT in public approved list');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/reviews/approved`);
    const approvedReviews = response.data.reviews;
    
    const found = approvedReviews.find(r => r.id === testReviewId);
    
    if (!found) {
      success('Review correctly NOT visible in public list (still pending)');
      return true;
    } else {
      error('FAILED: Review found in public list when it should be pending!');
      return false;
    }
  } catch (err) {
    error(`Failed to fetch approved reviews: ${err.message}`);
    return false;
  }
}

// Test 3: Login as admin
async function loginAsAdmin() {
  step('Test 3: Login as admin');
  
  try {
    // Try to login with admin credentials
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'cplayfit@gmail.com',
      password: 'Admin@123'
    });
    
    adminToken = response.data.token;
    success(`Admin logged in successfully!`);
    info(`Admin: ${response.data.user.name} (${response.data.user.email})`);
    return true;
  } catch (err) {
    error(`Failed to login as admin: ${err.response?.data?.error || err.message}`);
    info('Using admin credentials from database');
    return false;
  }
}

// Test 4: Verify review is in pending list (admin only)
async function verifyInPendingList() {
  step('Test 4: Verify review IS in admin pending list');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/reviews/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const pendingReviews = response.data.reviews;
    const found = pendingReviews.find(r => r.id === testReviewId);
    
    if (found) {
      success(`Review found in pending list!`);
      info(`Status: ${found.status}, Name: ${found.name}, Rating: ${found.rating}★`);
      return true;
    } else {
      error('FAILED: Review NOT found in pending list!');
      return false;
    }
  } catch (err) {
    error(`Failed to fetch pending reviews: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// Test 5: Approve the review
async function approveReview() {
  step('Test 5: Approve the review');
  
  try {
    const response = await axios.put(
      `${API_BASE_URL}/reviews/${testReviewId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    success(`Review approved successfully!`);
    info(`Message: ${response.data.message}`);
    
    // Wait a moment for the database to update
    await delay(500);
    return true;
  } catch (err) {
    error(`Failed to approve review: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// Test 6: Verify review is NOW in public approved list
async function verifyNowInPublicList() {
  step('Test 6: Verify review IS NOW in public approved list');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/reviews/approved`);
    const approvedReviews = response.data.reviews;
    
    const found = approvedReviews.find(r => r.id === testReviewId);
    
    if (found) {
      success('Review now visible in public list! ✨');
      info(`Name: ${found.name}, Rating: ${found.rating}★`);
      info(`Message: "${found.message}"`);
      return true;
    } else {
      error('FAILED: Review still NOT in public list after approval!');
      return false;
    }
  } catch (err) {
    error(`Failed to fetch approved reviews: ${err.message}`);
    return false;
  }
}

// Test 7: Get review statistics
async function getReviewStats() {
  step('Test 7: Get review statistics');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/reviews/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const stats = response.data.stats;
    success('Review statistics fetched successfully!');
    info(`Pending: ${stats.pending_count}`);
    info(`Approved: ${stats.approved_count}`);
    info(`Rejected: ${stats.rejected_count}`);
    info(`Total: ${stats.total_count}`);
    info(`Average Rating: ${stats.average_rating ? parseFloat(stats.average_rating).toFixed(2) : 'N/A'}★`);
    return true;
  } catch (err) {
    error(`Failed to fetch stats: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n═══════════════════════════════════════════════════════', 'yellow');
  log('   Review Moderation System - Integration Test', 'yellow');
  log('═══════════════════════════════════════════════════════\n', 'yellow');
  
  const results = [];
  
  // Run all tests in sequence
  results.push(await submitTestReview());
  results.push(await verifyNotInPublicList());
  results.push(await loginAsAdmin());
  results.push(await verifyInPendingList());
  results.push(await approveReview());
  results.push(await verifyNowInPublicList());
  results.push(await getReviewStats());
  
  // Summary
  log('\n═══════════════════════════════════════════════════════', 'yellow');
  log('   Test Summary', 'yellow');
  log('═══════════════════════════════════════════════════════\n', 'yellow');
  
  const passed = results.filter(r => r === true).length;
  const total = results.length;
  
  if (passed === total) {
    success(`All tests passed! (${passed}/${total})`);
    log('\n✨ Review moderation system is working correctly!\n', 'green');
    process.exit(0);
  } else {
    error(`Some tests failed. Passed: ${passed}/${total}`);
    log('\n⚠️  Please check the errors above.\n', 'red');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(err => {
  error(`\nUnexpected error: ${err.message}`);
  process.exit(1);
});
