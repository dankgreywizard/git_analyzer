/**
 * Initialize AOS (Animate On Scroll) library
 */
export function initAOS() {
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      easing: 'ease-in-out',
      once: true,
      offset: 100,
    });
  }
}

/**
 * Add fade-in animation to element
 */
export function fadeIn(element, duration = 500) {
  element.style.opacity = '0';
  element.style.transition = `opacity ${duration}ms ease-in`;
  
  setTimeout(() => {
    element.style.opacity = '1';
  }, 10);
}

/**
 * Add slide-up animation to element
 */
export function slideUp(element, duration = 300) {
  element.style.transform = 'translateY(10px)';
  element.style.opacity = '0';
  element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
  
  setTimeout(() => {
    element.style.transform = 'translateY(0)';
    element.style.opacity = '1';
  }, 10);
}

