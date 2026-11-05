# Criteria: category-library

AC-01 Given a buyer opens the catalogue type library When they view it Then existing catalogue types are listed with name and field count [ui]

AC-02 Given a buyer chooses to create a new category When they open the schema builder Then they can add fields with name, type (text/number/select/boolean), and allowed values [ui]

AC-03 Given a buyer defines a new catalogue type When they save it Then the type is immediately available for capture [ui] [data]

AC-04 Given a buyer creates a category with a required field When they capture against it Then the field appears on the review screen and must be filled [ui] [data]

AC-05 Given a buyer edits an existing catalogue type When they save changes Then a new schema version is created and existing items keep their original version [data]

AC-06 Given a catalogue type has committed items When the buyer attempts to delete it Then deletion is blocked with a clear reason [ui] [data]

AC-07 Given a buyer deletes an unused catalogue type When they confirm Then the type is removed from the library [ui] [data]

AC-08 Given a buyer views a catalogue type definition When they open it Then all fields, types, allowed values, and extraction hints are shown [ui]

AC-09 Given a buyer creates a field with an invalid type When they save Then a validation error is shown and the type is not created [ui] [manual]

AC-10 Given a buyer creates a catalogue type When they start a capture Then the type appears in the catalogue type picker [ui]

AC-11 Given a buyer edits a schema field's allowed values When they save Then existing committed items are unaffected [data]
