export const stepperState = $state({ open: false, step: 1 });

// The single entry point for opening the tour — always resets to slide 1 first. A plain
// `stepperState.open = true` from outside Stepper.svelte can't reliably trigger a reset from
// inside it: Stepper.svelte's `currentStep` was a local reactive statement watching
// `stepperState.open`, but legacy `$:` blocks in a non-runes component only re-run off their
// component's own `let` dependencies, not off external $state proxy reads — so it missed
// external opens (e.g. from the sidebar's Help menu) after a prior run had advanced past slide 1.
export function openTour() {
	stepperState.step = 1;
	stepperState.open = true;
}
