// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:edulink_app/main.dart';

void main() {
  testWidgets('App load smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const ProviderScope(child: EdulinkApp()));

    // Verify that our app starts (check for some text in the welcome screen)
    // Since it's a router-based app, we might need to pump and settle.
    await tester.pumpAndSettle();
    
    // Check for the app name in the Welcome screen
    expect(find.text('EduLink KE'), findsOneWidget);
  });
}
