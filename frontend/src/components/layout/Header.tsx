import { AppearanceMenu } from "@/components/ui/appearance-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useHeader } from "@/contexts/HeaderContext";
import { Sparkles, User } from "lucide-react";
import { Fragment } from "react";
import { Link } from "react-router-dom";

export function Header() {
  const { breadcrumbs, actions } = useHeader();

  return (
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <Fragment key={crumb.label}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage
                        className={
                          index === 0
                            ? "font-display font-medium flex items-center gap-1"
                            : "flex items-center gap-2"
                        }
                      >
                        {index === 0 && <Sparkles className="h-4 w-4" />}
                        {crumb.element ?? crumb.label}
                      </BreadcrumbPage>
                    ) : crumb.href ? (
                      <BreadcrumbLink asChild>
                        <Link
                          to={crumb.href}
                          className={
                            index === 0
                              ? "font-display font-medium flex items-center gap-1"
                              : ""
                          }
                        >
                          {index === 0 && <Sparkles className="h-4 w-4" />}
                          {crumb.label}
                        </Link>
                      </BreadcrumbLink>
                    ) : (
                      <span
                        className={
                          index === 0
                            ? "font-display font-medium flex items-center gap-1"
                            : ""
                        }
                      >
                        {index === 0 && <Sparkles className="h-4 w-4" />}
                        {crumb.label}
                      </span>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile" aria-label="Profile">
              <User className="h-4 w-4" />
            </Link>
          </Button>
          <AppearanceMenu />
          {actions}
        </div>
      </div>
    </header>
  );
}
