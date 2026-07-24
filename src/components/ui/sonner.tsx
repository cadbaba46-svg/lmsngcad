import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      closeButton
      duration={1000000}
      offset="50%"
      className="toaster group lms-sonner-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:w-[44rem] group-[.toaster]:max-w-[calc(100vw-2rem)] group-[.toaster]:min-h-44 group-[.toaster]:rounded-lg group-[.toaster]:border group-[.toaster]:bg-background group-[.toaster]:p-10 group-[.toaster]:text-center group-[.toaster]:text-lg group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl",
          content: "group-[.toast]:w-full group-[.toast]:items-center",
          title: "group-[.toast]:text-2xl group-[.toast]:font-semibold group-[.toast]:leading-snug",
          description: "group-[.toast]:text-base group-[.toast]:text-muted-foreground group-[.toast]:leading-relaxed",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: "sonner-ok-button group-[.toast]:left-1/2 group-[.toast]:right-auto group-[.toast]:top-auto group-[.toast]:bottom-6 group-[.toast]:h-11 group-[.toast]:min-w-28 group-[.toast]:-translate-x-1/2 group-[.toast]:rounded-md group-[.toast]:bg-primary group-[.toast]:px-8 group-[.toast]:text-primary-foreground group-[.toast]:opacity-100",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
