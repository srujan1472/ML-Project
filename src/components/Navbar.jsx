"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Navbar() {
  const pathname = usePathname()
  
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">Scanner App</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link 
              href="/home" 
              className={`transition-colors hover:text-foreground/80 ${pathname === '/home' ? 'text-foreground' : 'text-foreground/60'}`}
            >
              <div className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                <span>Home</span>
              </div>
            </Link>
            <Link 
              href="/products" 
              className={`transition-colors hover:text-foreground/80 ${pathname === '/products' ? 'text-foreground' : 'text-foreground/60'}`}
            >
              <div className="flex items-center gap-1">
                <ShoppingCart className="h-4 w-4" />
                <span>Products</span>
              </div>
            </Link>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2">
              <Link href="/login">
                <span className="sr-only">Login</span>
                <span>Login</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}