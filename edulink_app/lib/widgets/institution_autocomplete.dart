import 'package:flutter/material.dart';
import '../models/kuccps_institution.dart';

class InstitutionAutocomplete extends StatelessWidget {
  final TextEditingController controller;
  final void Function(KuccpsInstitution?) onInstitutionSelected;
  final String? Function(String?)? validator;
  final List<KuccpsInstitution> institutions;

  const InstitutionAutocomplete({
    super.key,
    required this.controller,
    required this.onInstitutionSelected,
    this.validator,
    this.institutions = const [],
  });

  @override
  Widget build(BuildContext context) {
    return Autocomplete<KuccpsInstitution>(
      optionsBuilder: (TextEditingValue textEditingValue) {
        if (textEditingValue.text == '') {
          // Show all institutions if the field is empty
          return institutions;
        }
        return institutions.where((KuccpsInstitution inst) =>
            inst.name.toLowerCase().contains(textEditingValue.text.toLowerCase()));
      },
      displayStringForOption: (KuccpsInstitution option) => option.name,
      fieldViewBuilder: (context, textEditingController, focusNode, onFieldSubmitted) {
        controller.text = textEditingController.text;
        return TextFormField(
          controller: textEditingController,
          focusNode: focusNode,
          decoration: const InputDecoration(
            hintText: 'Institution',
            prefixIcon: Icon(Icons.school),
          ),
          validator: validator,
        );
      },
      onSelected: (KuccpsInstitution selection) {
        controller.text = selection.name;
        onInstitutionSelected(selection);
      },
    );
  }
} 