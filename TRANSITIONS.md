# Shared domain transition

Load `domain-transition.css` and `domain-transition.js` on source and destination.
Navigate with `DFlowTransition.navigate(url)`. Mark independent destination elements
with `data-transition-item`, or set a selector in `body[data-transition-elements]`.
Avoid selecting both an element and its ancestors.

The outgoing page slides up using cross-document View Transitions where supported.
Incoming elements rise individually, staggered up to 160ms, with an exponentially
decaying cosine rebound. All finish at 1200ms; animation transforms are removed to
restore exact normal layout. Other browsers retain individual entry animations.
Reduced-motion users navigate without animation. Network loading is outside the
animation duration. Direct visits do not animate.

Business uses this source; future domains can use the same hooks. Life links to
the dashboard because no Life page exists yet.
