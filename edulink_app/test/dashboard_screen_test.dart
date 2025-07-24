import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:edulink_app/views/dashboard_screen.dart';

void main() {
  testWidgets('DashboardScreen displays user info and sections', (WidgetTester tester) async {
    final user = {
      'email': 'testuser@example.com',
      'role': 'student',
      'profile': {
        'first_name': 'Test',
        'last_name': 'User',
      }
    };

    await tester.pumpWidget(
      MaterialApp(
        home: DashboardScreen(user: user),
      ),
    );

    // Check for greeting
    expect(find.text('Welcome, Test!'), findsOneWidget);
    // Check for name
    expect(find.text('Test User'), findsOneWidget);
    // Check for email
    expect(find.text('testuser@example.com'), findsOneWidget);
    // Check for role
    expect(find.text('student'), findsOneWidget);
    // Check for Quick Actions section
    expect(find.text('Quick Actions'), findsOneWidget);
    // Check for Recent Activity section
    expect(find.text('Recent Activity'), findsOneWidget);
  });
} 