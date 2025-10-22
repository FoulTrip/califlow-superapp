"use client";

import React, {
    createContext,
    useContext,
    ReactNode,
    useState,
    useEffect
} from "react";

interface DarkModeContextType {
    darkmode: boolean;
    changeDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export function DarkModeProvider({ children }: { children: ReactNode }) {
    // Estado para controlar si estamos en el cliente
    const [mounted, setMounted] = useState(false);
    // Estado para el modo oscuro con valor inicial para SSR
    const [darkmode, setDarkmode] = useState(false);

    // Este efecto solo se ejecuta una vez al montar el componente en el cliente
    useEffect(() => {
        // Verificamos si estamos en el navegador
        if (typeof window !== 'undefined') {
            setMounted(true);

            // Determinar el tema inicial
            const savedTheme = localStorage.getItem("theme");
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

            const initialDarkMode =
                savedTheme === "dark" ||
                (savedTheme === null && prefersDark);

            setDarkmode(initialDarkMode);

            // Aplicar el tema inicial al documento
            if (initialDarkMode) {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }

            // console.log("Tema inicial:", initialDarkMode ? "oscuro" : "claro");
        }
    }, []);

    // Escuchar cambios en preferencias del sistema
    useEffect(() => {
        if (!mounted) return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const handleChange = (e: MediaQueryListEvent) => {
            // Solo cambiar automáticamente si no hay preferencia guardada
            if (!localStorage.getItem("theme")) {
                const newDarkMode = e.matches;
                setDarkmode(newDarkMode);

                if (newDarkMode) {
                    document.documentElement.classList.add("dark");
                } else {
                    document.documentElement.classList.remove("dark");
                }

                // console.log("Tema del sistema cambiado:", newDarkMode ? "oscuro" : "claro");
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [mounted]);

    // Función para cambiar manualmente el tema
    const changeDarkMode = () => {
        // Importante: usar la forma funcional para asegurar el valor actualizado
        setDarkmode(prevDarkMode => {
            const newDarkMode = !prevDarkMode;

            // Aplicar el cambio al DOM
            if (newDarkMode) {
                document.documentElement.classList.add("dark");
                localStorage.setItem("theme", "dark");
            } else {
                document.documentElement.classList.remove("dark");
                localStorage.setItem("theme", "light");
            }

            // console.log("Tema cambiado manualmente:", newDarkMode ? "oscuro" : "claro");
            return newDarkMode;
        });
    };

    return (
        <DarkModeContext.Provider value={{ darkmode, changeDarkMode }}>
            {children}
        </DarkModeContext.Provider>
    );
}

export function useDarkMode() {
    const context = useContext(DarkModeContext);
    if (context === undefined) {
        throw new Error("useDarkMode must be used within a DarkModeProvider");
    }
    return context;
}