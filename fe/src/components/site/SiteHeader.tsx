import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, Menu } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { sitePages } from '@/pages/siteContent'
import { publicSitePath } from '@/content/siteNavigation'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { isBrandTheme, themeLogo } from '@/components/cartoon/controlThemes'

export default function SiteHeader() {
  const theme = useControlTheme()
  const branded = isBrandTheme(theme)
  const location = useLocation()
  const pathname = publicSitePath(location.pathname)
  const currentPage = sitePages.find((item) => item.href === pathname)

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="site-brand" to="/about" aria-label="Về trang giới thiệu EmCoin">
            <span className="site-brand-mark">
              <img src={branded ? themeLogo(theme) : '/logo.svg'} alt="" />
            </span>
            {!branded && <span>
              EmCoin
              <small>Đồng tiền tử tế</small>
            </span>}
          </Link>

          <nav className="site-nav" aria-label="Điều hướng chính">
            {sitePages.map((item) => (
              <Link
                key={item.href}
                className={cn('site-nav-link', pathname === item.href && 'is-active')}
                to={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="site-menu-btn" type="button" aria-label="Mở menu chuyển trang">
                  <Menu className="site-menu-mobile-icon" aria-hidden="true" />
                  <span>{currentPage?.label ?? 'Giới thiệu'}</span>
                  <ChevronDown className="site-menu-icon" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="site-menu-content">
                {sitePages.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link to={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>

      <style>{`
        .site-header {
          --header-ink: var(--ink, #245f8f);
          --header-accent: var(--accent, #ef5f8a);
          position: fixed;
          inset: 0 0 auto;
          z-index: 50;
          height: 74px;
          display: flex;
          align-items: center;
          background: rgba(255,250,242,.9);
          border-bottom: 1px solid rgba(255,255,255,.58);
          box-shadow: 0 10px 32px rgba(111,78,55,.12);
          backdrop-filter: blur(18px);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .site-header-inner {
          width: min(1120px, calc(100% - 32px));
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .site-brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: var(--header-ink);
          text-decoration: none;
        }

        .site-brand-mark {
          width: 58px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .site-brand-mark img {
          width: 58px;
          height: 44px;
          object-fit: contain;
        }

        .site-brand > span:last-child {
          display: grid;
          gap: 1px;
          color: var(--header-ink);
          font-family: "Fraunces", Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -.03em;
          line-height: 1;
        }

        .site-brand small {
          color: var(--header-accent);
          font-size: 11px;
          font-style: italic;
          font-weight: 700;
        }

        .site-nav {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: flex-end;
        }

        .site-nav-link,
        .site-menu-btn {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          border: 1px solid rgba(36,95,143,.14);
          border-radius: 999px;
          background: rgba(255,253,248,.72);
          color: var(--header-ink);
          text-decoration: none;
          font: inherit;
          font-size: 14px;
          font-weight: 850;
          box-shadow: 0 10px 24px rgba(111,78,55,.07);
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .site-nav-link:hover,
        .site-menu-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(111,78,55,.12);
        }

        .site-nav-link.is-active {
          border-color: transparent;
          background: var(--header-ink);
          color: white;
        }

        .site-menu-btn {
          gap: 8px;
          cursor: pointer;
          appearance: none;
        }

        .site-menu-icon,
        .site-menu-mobile-icon {
          width: 16px;
          height: 16px;
        }

        .site-menu-mobile-icon {
          display: none;
        }

        .site-menu-content {
          min-width: 13rem;
          border-radius: 18px;
          border-color: rgba(36,95,143,.14);
          background: rgba(255,253,248,.97);
          box-shadow: 0 22px 44px rgba(111,78,55,.16);
          backdrop-filter: blur(14px);
        }

        .site-menu-content a {
          color: var(--header-ink);
          font-weight: 800;
          text-decoration: none;
        }

        @media (max-width: 740px) {
          .site-header {
            height: 68px;
          }

          .site-header-inner {
            width: min(100% - 28px, 520px);
          }

          .site-brand-mark,
          .site-brand-mark img {
            width: 52px;
            height: 38px;
          }

          .site-brand > span:last-child {
            font-size: 19px;
          }

          .site-nav-link {
            display: none;
          }

          .site-menu-btn {
            min-width: 44px;
            min-height: 44px;
            padding: 0 12px;
          }

          .site-menu-btn span,
          .site-menu-icon {
            display: none;
          }

          .site-menu-mobile-icon {
            display: block;
            width: 19px;
            height: 19px;
          }
        }
      `}</style>
    </>
  )
}
