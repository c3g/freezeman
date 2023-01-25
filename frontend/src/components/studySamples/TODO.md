# Study Samples TODO's

* Add filtering and sorting to sample tables in sample study view
* The "hide empty steps" setting should apply to all study views across the app.
* DONE Add control to filter empty steps
* DONE Library table is very wide extends past the right edge of the Collapse panel 
* DONE Get the study workflow and create a section for every step, even if there are no samples.
* DONE Display a 'This study does not contain any samples' message instead of an empty Samples table
* Improve the code for loading samples and library in the study samples action
- check for samples and libraries in the store and only fetch the samples and libraries
that need to be loaded.
* DONE Flush the redux state when the component is destroyed 
* Keep track of the expanded state of the Collapse so that user when user navigates
back to the view they don't have to re-expand steps (put it in the url?)
* Add a 'completed' section to list samples that have completed the workflow
* Refine the column choices for each protocol/step
* Use step specifications to decide between sample table vs library table for steps like pooling
* Improve the appearance of the collapse items
* Implement a refresh mechanism (button? timer?)
* Add a 'remove sample' (trash can) button to the tables
