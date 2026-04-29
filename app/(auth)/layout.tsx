// app/(auth)/layout.tsx
// This layout wraps ONLY the login and signup pages.
// It has no Navbar — just a centered column on the dark background.
// The (auth) route group means this layout applies to /login and /signup.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Logo at top */}
      <a
        href="/"
        style={{
          marginBottom: '40px',
          fontSize: '20px',
          fontWeight: '700',
          color: 'var(--accent)',
          textDecoration: 'none',
          letterSpacing: '-0.5px',
        }}
      >
        Forge
      </a>

      {/* The actual login or signup form goes here */}
      {children}
    </div>
  )
}
