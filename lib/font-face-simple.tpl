@font-face {
    font-family: "<%=fontFamily%>";
    src: <%if (local) {%>local("<%=local%>"), <%}%><% if (base64) { %>url(<%=base64%>) format("truetype"), /* chrome, firefox, opera, Safari, Android, iOS 4.2+ */<% } else { %>url("<%=fontPath%><%=fontFile%>.ttf") format("truetype"); /* chrome, firefox, opera, Safari, Android, iOS 4.2+ */<% } %>
    font-style: normal;
    font-weight: normal;
}
