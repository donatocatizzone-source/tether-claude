import { createContext, useContext, useState, type ReactNode } from "react";

// Backs the hamburger button in Home.tsx. Lives above AppShell so any
// routed page can open the drawer without
// AppShell having to pass callbacks down through React Router's outlet.
interface MenuDrawerContextValue {
  isOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const MenuDrawerContext = createContext<MenuDrawerContextValue | null>(null);

export function MenuDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <MenuDrawerContext.Provider
      value={{
        isOpen,
        openMenu: () => setIsOpen(true),
        closeMenu: () => setIsOpen(false),
      }}
    >
      {children}
    </MenuDrawerContext.Provider>
  );
}

export function useMenuDrawer() {
  const ctx = useContext(MenuDrawerContext);
  if (!ctx) throw new Error("useMenuDrawer must be used within MenuDrawerProvider");
  return ctx;
}
