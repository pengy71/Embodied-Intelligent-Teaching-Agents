"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GraduationCap, User, LayoutDashboard, BookOpen, Wrench, Bot, Library, MessageSquare, ClipboardList, LogOut, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/use-session";
import { useRouter } from "next/navigation";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  role: "teacher" | "student";
  roleLabel: string;
  userName: string;
  userDesc: string;
}

const teacherNavItems: NavItem[] = [
  { title: "课程概览", href: "/teaching/teacher", icon: LayoutDashboard },
  { title: "课程建设", href: "/teaching/teacher/course", icon: BookOpen },
  { title: "教学工具", href: "/teaching/teacher/tools", icon: Wrench },
];

const studentNavItems: NavItem[] = [
  { title: "AI学习助手", href: "/teaching/student", icon: Bot },
  { title: "学习资源", href: "/teaching/student/resources", icon: Library },
  { title: "答疑中心", href: "/teaching/student/qa", icon: MessageSquare },
  { title: "练习测试", href: "/teaching/student/practice", icon: ClipboardList },
];

export function TeachingSidebar({ role, roleLabel, userName, userDesc }: SidebarProps) {
  const pathname = usePathname();
  const navItems = role === "teacher" ? teacherNavItems : studentNavItems;
  const Icon = role === "teacher" ? GraduationCap : User;
  const { logout } = useSession();
  const router = useRouter();
  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">具身智能教学</p>
            <p className="truncate text-xs text-muted-foreground">
              {userName} · {roleLabel}
            </p>
          </div>
        </Link>
      </header>

      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r bg-background md:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">具身智能教学</h2>
            <p className="text-xs text-muted-foreground">Embodied Teaching</p>
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 border-b p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userDesc}</p>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-4 pt-4">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {roleLabel}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? "secondary" : "ghost"}
                className={cn("w-full justify-start gap-3", isActive && "bg-primary/10 text-primary hover:bg-primary/15")}
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </Button>
            );
          })}
        </nav>

        {/* Back to main */}
        <div className="border-t p-4 space-y-1">
          <Button asChild variant="ghost" className="w-full justify-start gap-3">
            <Link href="/">
              <Brain className="h-4 w-4" />
              返回教学首页
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            退出登录
          </Button>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 border-t bg-background/95 backdrop-blur md:hidden"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] text-muted-foreground transition-colors",
                isActive && "text-primary",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
