VERSION=1.0
JAVA=java
YUICOMPRESSOR=/opt/yuicompressor/yuicompressor-2.4.2.jar
RIQUERY=../ri.query/ri.query-min.js

ri.widget: merged

merged: ri.widget-min.js
	cat ${RIQUERY} $< > ri.widget-${VERSION}.js

%-min.js: %.js
	${JAVA} -jar ${YUICOMPRESSOR} $< -o ${<:.js=-min.js}

clean:
	rm -f ri.widget-min.js

