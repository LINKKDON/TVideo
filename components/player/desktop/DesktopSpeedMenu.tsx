import React from 'react';
import { createPortal } from 'react-dom';

interface DesktopSpeedMenuProps {
    showSpeedMenu: boolean;
    playbackRate: number;
    speeds: number[];
    onSpeedChange: (speed: number) => void;
    onToggleSpeedMenu: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
    isRotated?: boolean;
}

export function DesktopSpeedMenu({
    showSpeedMenu,
    playbackRate,
    speeds,
    onSpeedChange,
    onToggleSpeedMenu,
    onMouseEnter,
    onMouseLeave,
    containerRef,
    isRotated = false
}: DesktopSpeedMenuProps) {
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const [menuPosition, setMenuPosition] = React.useState({ top: 0, left: 0, maxHeight: 'none', openUpward: false });

    const [isFullscreen, setIsFullscreen] = React.useState(false);

    React.useEffect(() => {
        const updateFullscreen = () => {
            // Check both native fullscreen and window fullscreen (CSS-based)
            const nativeFullscreen = !!document.fullscreenElement;
            const windowFullscreen = containerRef.current?.closest('.is-web-fullscreen') !== null;
            setIsFullscreen(nativeFullscreen || windowFullscreen);
        };
        document.addEventListener('fullscreenchange', updateFullscreen);
        // Also check periodically for window fullscreen changes (CSS class based)
        const interval = setInterval(updateFullscreen, 500);
        updateFullscreen();
        return () => {
            document.removeEventListener('fullscreenchange', updateFullscreen);
            clearInterval(interval);
        };
    }, [containerRef]);

    // Calculate menu position with available space awareness
    const calculateMenuPosition = React.useCallback(() => {
        if (!buttonRef.current || !containerRef.current) return;

        if (!buttonRef.current || !containerRef.current) return;

        // Calculate position relative to container using offsetParent loop
        // This works regardless of container rotation because we stay in the local coordinate system
        let top = 0;
        let left = 0;
        let el: HTMLElement | null = buttonRef.current;

        while (el && el !== containerRef.current) {
            top += el.offsetTop;
            left += el.offsetLeft;
            el = el.offsetParent as HTMLElement;
        }

        const buttonHeight = buttonRef.current.offsetHeight;
        const buttonWidth = buttonRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;

        // Use container dimensions for available space
        const spaceBelow = containerHeight - (top + buttonHeight) - 20;
        const spaceAbove = top - 20;

        // Estimate menu height (or use actual if already rendered)
        const estimatedMenuHeight = 250; // approximate height of speed menu
        const actualMenuHeight = menuRef.current?.offsetHeight || estimatedMenuHeight;

        // Determine if we should open upward
        const openUpward = spaceBelow < Math.min(actualMenuHeight, 200) && spaceAbove > spaceBelow;

        // Calculate max-height based on available space
        const maxHeight = openUpward
            ? Math.min(spaceAbove, actualMenuHeight)
            : Math.min(spaceBelow, containerHeight * 0.7);

        if (openUpward) {
            setMenuPosition({
                top: top - 10,
                left: left + buttonWidth, // Right align? No, original was left: buttonRect.right - containerRect.left
                // Original logic: left = buttonRect.right - containerRect.left. 
                // In local coords, buttonRect.right = left + buttonWidth.
                // But we want to align the RIGHT edge of menu with RIGHT edge of button?
                // CSS uses `transform: translateX(-100%)` and `left: ${menuPos.left}`.
                // So left should be the right edge of the button.
                maxHeight: `${maxHeight}px`,
                openUpward: true
            });
        } else {
            setMenuPosition({
                top: top + buttonHeight + 10,
                left: left + buttonWidth,
                maxHeight: `${maxHeight}px`,
                openUpward: false
            });
        }
    }, [containerRef]);



    // Auto-close menu on scroll
    React.useEffect(() => {
        if (!showSpeedMenu) return;
        const handleScroll = () => {
            if (showSpeedMenu) {
                onToggleSpeedMenu();
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [showSpeedMenu, onToggleSpeedMenu]);

    React.useEffect(() => {
        if (showSpeedMenu) {
            calculateMenuPosition();
            const timer = setTimeout(calculateMenuPosition, 50);
            return () => clearTimeout(timer);
        }
    }, [showSpeedMenu, calculateMenuPosition]);

    const handleToggle = () => {
        if (!showSpeedMenu) {
            calculateMenuPosition();
        }
        onToggleSpeedMenu();
    };

    const MenuContent = (
        <div
            ref={menuRef}
            className={`absolute z-[50] bg-[var(--glass-bg)] backdrop-blur-[25px] saturate-[180%] rounded-[var(--radius-2xl)] border border-[var(--glass-border)] shadow-[var(--shadow-md)] p-1 sm:p-1.5 w-fit min-w-[3.5rem] sm:min-w-[4.5rem] animate-in fade-in zoom-in-95 duration-200 overflow-y-auto`}
            style={{
                top: menuPosition.openUpward ? 'auto' : `${menuPosition.top}px`,
                bottom: menuPosition.openUpward ? `calc(100% - ${menuPosition.top}px + 10px)` : 'auto',
                left: `${menuPosition.left}px`,
                transform: 'translateX(-100%)',
                maxHeight: menuPosition.maxHeight,
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
        >
            {speeds.map((speed) => (
                <button
                    key={speed}
                    onClick={() => onSpeedChange(speed)}
                    className={`w-full px-3 py-1 sm:px-4 sm:py-1.5 rounded-[var(--radius-2xl)] text-xs sm:text-sm font-medium transition-colors ${playbackRate === speed
                        ? 'bg-[var(--accent-color)] text-white'
                        : 'text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_15%,transparent)]'
                        }`}
                >
                    {speed}x
                </button>
            ))}
        </div>
    );

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={handleToggle}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                className="group flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 text-white/90 font-medium text-xs sm:text-sm"
                aria-label="播放速度"
            >
                {playbackRate}x
            </button>

            {/* Speed Menu (Portal) - Portal to container to inherit rotation but avoid overflow clipping if container has it? 
                Actually, the container usually has overflow-hidden.
                If we portal to containerRef, it is inside the container div.
                If the container div has overflow-hidden, the menu will be clipped.
                BUT DesktopVideoPlayer structure:
                <div ref={containerRef} ...> (relative, no overflow hidden?)
                  <div className="absolute inset-0 overflow-hidden ..."> (video wrapper)
                  <DesktopOverlayWrapper ...>
                So containerRef itself (outer wrapper) seems to NOT have overflow-hidden in my memory?
                Checking DesktopVideoPlayer.tsx:
                className={`kvideo-container relative aspect-video ...`}
                It does NOT have overflow-hidden. The inner div does.
                So portaling to containerRef is SAFE and CORRECT.
            */}
            {showSpeedMenu && containerRef.current && createPortal(MenuContent, containerRef.current)}
        </div>
    );
}
