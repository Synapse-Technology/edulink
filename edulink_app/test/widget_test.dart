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

    // Let the finite entrance animation complete. The welcome screen also has
    // a pulsing status chip, so pumpAndSettle would wait forever.
    await tester.pump(const Duration(seconds: 1));

    // Check for the app name in the Welcome screen
    expect(find.text('EduLink'), findsOneWidget);
  });
}
