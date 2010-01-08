JAVA=java
YUICOMPRESSOR=/opt/yuicompressor/yuicompressor-2.4.2.jar
RIQUERY_PATH=../ri.query/ri.query-min.js

ri.widget: ri.widget-min.js

%-min.js: %.js
	${JAVA} -jar ${YUICOMPRESSOR} $< -o ${<:.js=-min.js}

clean:
	rm -f ri.widget-min.js

