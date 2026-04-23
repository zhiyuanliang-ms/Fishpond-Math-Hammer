// Common page wrapper so every page shares the same outer container/title style.
//
// Props:
//   title: optional <h1> title
//   children: page content
function Page({ title, children }) {
  return (
    <div className="page">
      {title && <h1>{title}</h1>}
      {children}
    </div>
  )
}

export default Page
