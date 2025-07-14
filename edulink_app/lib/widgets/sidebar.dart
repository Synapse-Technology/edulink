import 'package:flutter/material.dart';

class Sidebar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onItemSelected;

  const Sidebar({
    super.key,
    required this.selectedIndex,
    required this.onItemSelected,
  });

  @override
  Widget build(BuildContext context) {
    final items = [
      'Dashboard',
      'Browse Internships',
      'Application Tracker',
      'My Internship',
      'Profile',
      'Reports and logbooks',
      'CV & Toolkit',
    ];
    final icons = [
      Icons.dashboard,
      Icons.search,
      Icons.track_changes,
      Icons.work,
      Icons.person,
      Icons.assignment,
      Icons.build,
    ];
    return Container(
      width: 200,
      color: const Color(0xFF195B4B),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 32),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 24.0),
            child: Text(
              'EduLink KE',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 22,
                letterSpacing: 1.2,
              ),
            ),
          ),
          const SizedBox(height: 32),
          ...List.generate(items.length, (index) {
            return InkWell(
              onTap: () => onItemSelected(index),
              child: Container(
                color: selectedIndex == index
                    ? Colors.white.withOpacity(0.08)
                    : Colors.transparent,
                padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
                child: Row(
                  children: [
                    Icon(
                      icons[index],
                      color: Colors.white,
                      size: 22,
                    ),
                    const SizedBox(width: 16),
                    Text(
                      items[index],
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: selectedIndex == index
                            ? FontWeight.bold
                            : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
} 