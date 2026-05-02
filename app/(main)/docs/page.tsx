// app/(main)/docs/page.tsx
// Server Component — static documentation page explaining what Forge is

export default function DocsPage() {
  return (
    <>
      <style>{`
        .docs-section {
          background: #141416;
          border: 1px solid #2a2a2e;
          border-radius: 12px;
          padding: 28px;
          margin-bottom: 16px;
        }
        .docs-section h2 {
          font-size: 13px;
          font-weight: 600;
          color: #4a4a55;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin: 0 0 14px 0;
        }
        .docs-section p {
          font-size: 14px;
          color: #8b8b99;
          line-height: 1.75;
          margin: 0 0 12px 0;
        }
        .docs-section p:last-child { margin-bottom: 0; }
        .docs-section strong { color: #f0f0f2; font-weight: 500; }
        .docs-highlight {
          background: #f59e0b0a;
          border: 1px solid #f59e0b25;
          border-radius: 10px;
          padding: 20px 24px;
          margin-bottom: 16px;
        }
        .docs-highlight p {
          font-size: 15px;
          color: #f0f0f2;
          line-height: 1.7;
          margin: 0;
          font-weight: 400;
        }
        .docs-highlight em {
          color: #f59e0b;
          font-style: normal;
          font-weight: 600;
        }
        .docs-feature-row {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid #1f1f23;
        }
        .docs-feature-row:last-child { border-bottom: none; padding-bottom: 0; }
        .docs-feature-row:first-child { padding-top: 0; }
        .docs-feature-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: #1c1c1f;
          border: 1px solid #2a2a2e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .docs-step {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid #1f1f23;
        }
        .docs-step:last-child { border-bottom: none; padding-bottom: 0; }
        .docs-step:first-child { padding-top: 0; }
        .docs-step-num {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #f59e0b15;
          border: 1px solid #f59e0b30;
          color: #f59e0b;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
      `}</style>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <img
              src="/forge-logo.png"
              alt="Forge"
              style={{ width: '28px', height: '28px', objectFit: 'contain', filter: 'invert(1) sepia(1) saturate(5) hue-rotate(5deg) brightness(0.95)' }}
            />
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#f0f0f2', letterSpacing: '-0.5px' }}>Forge</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#f59e0b15', border: '1px solid #f59e0b30', color: '#f59e0b', fontWeight: 600 }}>ITM University Raipur</span>
          </div>
          <p style={{ fontSize: '14px', color: '#4a4a55', margin: 0, lineHeight: 1.6 }}>
            A permanent record of everything built, learned, and shared by students of ITM University.
          </p>
        </div>

        {/* The quote */}
        <div className="docs-highlight">
          <p>
            <em>Knowledge doesn't graduate.</em> The students do — but what they built, what they learned, and what they figured out should stay behind for everyone who comes after them.
          </p>
        </div>

        {/* Why it exists */}
        <div className="docs-section">
          <h2>Why Forge exists</h2>
          <p>
            In the first semester, a project called <strong>Winter Postcard</strong> was built. It had plans — seasonal themes, authentication, showing it to the whole college. None of that happened. The semester ended, the grade came in, and the project got uploaded to GitHub where nobody would ever find it.
          </p>
          <p>
            The work wasn't bad. It just had nowhere to go. No place to show it, no way for juniors to find it, no way for someone else to pick it up and add what was missing. It just sat there like it was worth nothing.
          </p>
          <p>
            And the problem isn't just one project. <strong>No college keeps a record of what its students build.</strong> Every batch starts from scratch. They don't know what the batch before them made, what problems they solved, what ideas they had. They'll probably build the same things again — not because they're lazy, but because they had no way of knowing.
          </p>
          <p>
            Forge is the fix for that.
          </p>
        </div>

        {/* How it works */}
        <div className="docs-section">
          <h2>How it works</h2>
          <div>
            <div className="docs-step">
              <div className="docs-step-num">1</div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#f0f0f2', marginBottom: '4px' }}>Submit your project</div>
                <div style={{ fontSize: '13px', color: '#8b8b99', lineHeight: 1.6 }}>Upload your project with a description, repo link, demo, tags, and team members. It goes live immediately — no approval queue, no gatekeeping.</div>
              </div>
            </div>
            <div className="docs-step">
              <div className="docs-step-num">2</div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#f0f0f2', marginBottom: '4px' }}>It stays there forever</div>
                <div style={{ fontSize: '13px', color: '#8b8b99', lineHeight: 1.6 }}>Unlike GitHub where nobody looks, Forge is where ITM students specifically come to browse. Your project doesn't disappear after the semester. It stays — permanently — as part of the college's history.</div>
              </div>
            </div>
            <div className="docs-step">
              <div className="docs-step-num">3</div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#f0f0f2', marginBottom: '4px' }}>Juniors discover it</div>
                <div style={{ fontSize: '13px', color: '#8b8b99', lineHeight: 1.6 }}>The next batch can browse by semester, by tag, by team. They understand what kind of projects people at ITM build, what assignments look like, what's already been done — and what's waiting to be improved.</div>
              </div>
            </div>
            <div className="docs-step">
              <div className="docs-step-num">4</div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#f0f0f2', marginBottom: '4px' }}>Someone builds on top of it</div>
                <div style={{ fontSize: '13px', color: '#8b8b99', lineHeight: 1.6 }}>If a junior takes your project further — adds the features you never got to, fixes what was broken, extends the idea — they link their project as a Build-On. You still get the credit. Even after you graduate.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="docs-section">
          <h2>What's inside</h2>
          <div>
            {[
              { icon: '🚀', title: 'Projects', desc: 'Submit and browse student projects with full documentation, links, tags, and team info.' },
              { icon: '🧱', title: 'Build-Ons', desc: 'Link your project as a continuation of someone else\'s work. A chain of credit that survives graduation.' },
              { icon: '👥', title: 'Teams', desc: 'Create teams, invite members, and submit projects together. Team workspace keeps everything organized.' },
              { icon: '📋', title: 'Assignments', desc: 'Save your assignments permanently. Make them public so juniors can reference them — or keep them private.' },
              { icon: '⭐', title: 'Stars & Saves', desc: 'Star projects you find impressive. Save ones you want to come back to.' },
              { icon: '👤', title: 'Profile', desc: 'Every student has a profile showing everything they\'ve built and contributed during their time at ITM.' },
            ].map(f => (
              <div key={f.title} className="docs-feature-row">
                <div className="docs-feature-icon">{f.icon}</div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#f0f0f2', marginBottom: '3px' }}>{f.title}</div>
                  <div style={{ fontSize: '13px', color: '#8b8b99', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Who is it for */}
        <div className="docs-section">
          <h2>Who is it for</h2>
          <p>
            Right now, <strong>ITM University Raipur</strong>. Forge needs to work well for us before it tries to work for anyone else.
          </p>
          <p>
            That said, Forge is open source. Any college that wants a permanent record of their students' work can run their own instance. But ITM is the focus — we want to get this right here first.
          </p>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 0', borderTop: '1px solid #1f1f23', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#4a4a55' }}>Built by Shivam Tiwari · BCA CTIS · ITM University Raipur</span>
          <a href="/projects" style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none' }}>Browse projects →</a>
        </div>

      </div>
    </>
  )
}
