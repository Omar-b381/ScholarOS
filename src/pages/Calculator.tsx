import * as React from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import * as math from 'mathjs'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  Calculator,
  RefreshCw,
  Clock,
  History,
  Trash2,
  AlertCircle
} from 'lucide-react'

const CONVERSION_CATEGORIES = {
  length: {
    label: 'الطول المسافة',
    units: [
      { value: 'm', label: 'متر (m)' },
      { value: 'cm', label: 'سنتيمتر (cm)' },
      { value: 'mm', label: 'مليمتر (mm)' },
      { value: 'km', label: 'كيلومتر (km)' },
      { value: 'inch', label: 'بوصة (inch)' },
      { value: 'foot', label: 'قدم (foot)' },
      { value: 'yard', label: 'ياردة (yard)' },
      { value: 'mile', label: 'ميل (mile)' }
    ]
  },
  mass: {
    label: 'الكتلة والوزن',
    units: [
      { value: 'g', label: 'جرام (g)' },
      { value: 'kg', label: 'كيلوجرام (kg)' },
      { value: 'mg', label: 'مليجرام (mg)' },
      { value: 'lb', label: 'رطل (lb)' },
      { value: 'oz', label: 'أونصة (oz)' }
    ]
  },
  temperature: {
    label: 'درجة الحرارة',
    units: [
      { value: 'degC', label: 'مئوية (C°)' },
      { value: 'degF', label: 'فهرنهايت (F°)' },
      { value: 'K', label: 'كلفن (K)' }
    ]
  },
  area: {
    label: 'المساحة',
    units: [
      { value: 'm2', label: 'متر مربع (m²)' },
      { value: 'cm2', label: 'سنتيمتر مربع (cm²)' },
      { value: 'km2', label: 'كيلومتر مربع (km²)' },
      { value: 'hectare', label: 'هكتار' },
      { value: 'acre', label: 'فدان (acre)' }
    ]
  },
  speed: {
    label: 'السرعة',
    units: [
      { value: 'm/s', label: 'متر/ثانية (m/s)' },
      { value: 'km/h', label: 'كيلومتر/ساعة (km/h)' },
      { value: 'mph', label: 'ميل/ساعة (mph)' },
      { value: 'knot', label: 'عقدة (knot)' }
    ]
  }
}

export function CalculatorPage() {
  const { calcHistory, addCalcHistory, clearCalcHistory } = useAppStore()

  // Calculator states
  const [expr, setExpr] = React.useState('')
  const [result, setResult] = React.useState('')
  const [latexHTML, setLatexHTML] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState('')

  // Unit converter states
  const [convCategory, setConvCategory] = React.useState<'length' | 'mass' | 'temperature' | 'area' | 'speed'>('length')
  const [convValue, setConvValue] = React.useState('1')
  const [convFromUnit, setConvFromUnit] = React.useState('m')
  const [convToUnit, setConvToUnit] = React.useState('cm')
  const [convResult, setConvResult] = React.useState('')

  // Trigger KaTeX update live
  React.useEffect(() => {
    if (!expr) {
      setLatexHTML('')
      setErrorMsg('')
      return
    }
    try {
      const parsedNode = math.parse(expr)
      const latex = parsedNode.toTex()
      const html = katex.renderToString(latex, { displayMode: true, throwOnError: false })
      setLatexHTML(html)
      setErrorMsg('')
    } catch (err) {
      // Normal error while typing, don't show full error alert yet
      setErrorMsg('معادلة غير مكتملة')
    }
  }, [expr])

  // Converter recalculate trigger
  React.useEffect(() => {
    handleConvert()
  }, [convCategory, convValue, convFromUnit, convToUnit])

  // Sync converter defaults when category changes
  React.useEffect(() => {
    const units = CONVERSION_CATEGORIES[convCategory].units
    setConvFromUnit(units[0].value)
    setConvToUnit(units[1].value)
  }, [convCategory])

  // Buttons handlers
  const handleBtnClick = (val: string) => {
    setExpr(prev => prev + val)
  }

  const handleClear = () => {
    setExpr('')
    setResult('')
    setErrorMsg('')
  }

  const handleBackspace = () => {
    setExpr(prev => prev.slice(0, -1))
  }

  const handleEvaluate = async () => {
    if (!expr) return
    try {
      const res = math.evaluate(expr)
      const formattedRes = typeof res === 'number' ? parseFloat(res.toFixed(8)).toString() : res.toString()
      
      setResult(formattedRes)
      setErrorMsg('')

      // Add to SQLite history log
      await addCalcHistory(expr, formattedRes)
    } catch (err: any) {
      console.error(err)
      setErrorMsg('خطأ في كتابة المعادلة الرياضية')
    }
  }

  // Converter evaluation
  const handleConvert = () => {
    if (!convValue || isNaN(Number(convValue))) {
      setConvResult('')
      return
    }
    try {
      // mathjs evaluation of units: math.evaluate('10 kg to lb')
      const exprStr = `${convValue} ${convFromUnit} to ${convToUnit}`
      const converted = math.evaluate(exprStr)
      // Format number
      const numVal = typeof converted === 'number' ? converted : converted.toNumber()
      setConvResult(parseFloat(numVal.toFixed(6)).toString())
    } catch (err) {
      console.error(err)
      setConvResult('خطأ تحويل')
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">الأدوات: الحاسبة العلمية والمحولات</h1>
        <p className="text-sm text-muted-foreground mt-1">حساب المعادلات الرياضية المعقدة وتحويل وحدات القياس العلمية</p>
      </div>

      <Tabs defaultValue="calculator">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="calculator">الحاسبة العلمية</TabsTrigger>
          <TabsTrigger value="converter">محول الوحدات</TabsTrigger>
        </TabsList>

        {/* TAB A: Scientific Calculator */}
        <TabsContent value="calculator" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Main Calculator UI */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="overflow-hidden border-2 border-primary/20">
              {/* LaTeX live math preview */}
              <div className="bg-muted/30 p-4 h-24 flex items-center justify-center border-b border-border font-mono relative overflow-x-auto">
                {latexHTML ? (
                  <div dangerouslySetInnerHTML={{ __html: latexHTML }} />
                ) : (
                  <span className="text-xs text-muted-foreground">صيغة KaTeX الرياضية تظهر هنا</span>
                )}
                {errorMsg && (
                  <span className="absolute bottom-2 left-2 bg-destructive/10 text-destructive text-[10px] font-bold py-0.5 px-2 rounded-full flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errorMsg}
                  </span>
                )}
              </div>

              {/* Calculator input display */}
              <div className="p-4 bg-card border-b">
                <Input
                  className="text-left font-mono text-xl font-bold bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-10"
                  dir="ltr"
                  placeholder="0"
                  value={expr}
                  onChange={e => setExpr(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEvaluate()}
                />
                <div className="text-left text-primary font-black font-mono text-2xl mt-1 h-8 overflow-hidden select-all" dir="ltr">
                  {result && `= ${result}`}
                </div>
              </div>

              {/* Scientific buttons grid */}
              <CardContent className="p-4 bg-muted/10 grid grid-cols-5 gap-2">
                {/* Row 1 */}
                <Button variant="outline" className="font-mono text-xs" onClick={() => handleBtnClick('sin(')}>sin</Button>
                <Button variant="outline" className="font-mono text-xs" onClick={() => handleBtnClick('cos(')}>cos</Button>
                <Button variant="outline" className="font-mono text-xs" onClick={() => handleBtnClick('tan(')}>tan</Button>
                <Button variant="outline" className="font-mono text-xs" onClick={() => handleBtnClick('log(')}>log</Button>
                <Button variant="outline" className="font-mono text-xs" onClick={() => handleBtnClick('sqrt(')}>√</Button>

                {/* Row 2 */}
                <Button variant="outline" className="font-mono text-xs" onClick={() => handleBtnClick('pi')}>π</Button>
                <Button variant="outline" className="font-mono text-xs" onClick={() => handleBtnClick('e')}>e</Button>
                <Button variant="outline" className="font-mono text-xs" onClick={() => handleBtnClick('^')}>xʸ</Button>
                <Button variant="outline" className="font-mono text-xs" onClick={() => handleBtnClick('!')}>x!</Button>
                <Button variant="outline" className="font-mono text-xs" onClick={() => handleBtnClick('abs(')}>|x|</Button>

                {/* Row 3 */}
                <Button variant="outline" className="font-mono text-base" onClick={() => handleBtnClick('(')}>(</Button>
                <Button variant="outline" className="font-mono text-base" onClick={() => handleBtnClick(')')}>)</Button>
                <Button variant="outline" className="font-mono text-base" onClick={() => handleBtnClick('%')}>%</Button>
                <Button variant="secondary" className="text-destructive font-bold text-xs" onClick={handleBackspace}>DEL</Button>
                <Button variant="secondary" className="text-destructive font-bold text-xs" onClick={handleClear}>C</Button>

                {/* Number keys */}
                <Button variant="default" className="bg-card text-foreground hover:bg-accent font-bold text-base shadow-sm" onClick={() => handleBtnClick('7')}>7</Button>
                <Button variant="default" className="bg-card text-foreground hover:bg-accent font-bold text-base shadow-sm" onClick={() => handleBtnClick('8')}>8</Button>
                <Button variant="default" className="bg-card text-foreground hover:bg-accent font-bold text-base shadow-sm" onClick={() => handleBtnClick('9')}>9</Button>
                <Button variant="secondary" className="font-bold text-base" onClick={() => handleBtnClick(' / ')}>/</Button>
                <Button variant="outline" className="font-mono text-xs" onClick={() => handleBtnClick('asin(')}>asin</Button>

                <Button variant="default" className="bg-card text-foreground hover:bg-accent font-bold text-base shadow-sm" onClick={() => handleBtnClick('4')}>4</Button>
                <Button variant="default" className="bg-card text-foreground hover:bg-accent font-bold text-base shadow-sm" onClick={() => handleBtnClick('5')}>5</Button>
                <Button variant="default" className="bg-card text-foreground hover:bg-accent font-bold text-base shadow-sm" onClick={() => handleBtnClick('6')}>6</Button>
                <Button variant="secondary" className="font-bold text-base" onClick={() => handleBtnClick(' * ')}>*</Button>
                <Button variant="outline" className="font-mono text-xs" onClick={() => handleBtnClick('acos(')}>acos</Button>

                <Button variant="default" className="bg-card text-foreground hover:bg-accent font-bold text-base shadow-sm" onClick={() => handleBtnClick('1')}>1</Button>
                <Button variant="default" className="bg-card text-foreground hover:bg-accent font-bold text-base shadow-sm" onClick={() => handleBtnClick('2')}>2</Button>
                <Button variant="default" className="bg-card text-foreground hover:bg-accent font-bold text-base shadow-sm" onClick={() => handleBtnClick('3')}>3</Button>
                <Button variant="secondary" className="font-bold text-base" onClick={() => handleBtnClick(' - ')}>-</Button>
                <Button variant="outline" className="font-mono text-xs" onClick={() => handleBtnClick('atan(')}>atan</Button>

                <Button variant="default" className="bg-card text-foreground hover:bg-accent font-bold text-base shadow-sm" onClick={() => handleBtnClick('0')}>0</Button>
                <Button variant="default" className="bg-card text-foreground hover:bg-accent font-bold text-base shadow-sm" onClick={() => handleBtnClick('.')}>.</Button>
                <Button variant="default" className="bg-card text-foreground hover:bg-accent font-bold text-base shadow-sm" onClick={() => handleBtnClick('exp(')}>exp</Button>
                <Button variant="secondary" className="font-bold text-base" onClick={() => handleBtnClick(' + ')}>+</Button>
                <Button variant="default" className="font-extrabold text-lg" onClick={handleEvaluate}>=</Button>
              </CardContent>
            </Card>
          </div>

          {/* History Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-bold text-sm text-muted-foreground flex items-center gap-1">
                <History className="h-4 w-4" />
                <span>سجل العمليات الرياضية</span>
              </h3>
              <Button size="sm" variant="ghost" className="text-destructive h-7 px-2" onClick={clearCalcHistory}>
                <Trash2 className="h-3.5 w-3.5" /> مسح
              </Button>
            </div>

            <Card className="h-[400px] overflow-y-auto scrollbar-thin">
              <CardContent className="p-3 space-y-2">
                {calcHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-10">السجل فارغ حالياً.</p>
                ) : (
                  calcHistory.map((item, idx) => (
                    <div
                      key={idx}
                      onDoubleClick={() => setExpr(item.expression)}
                      className="p-2.5 rounded-lg border bg-card hover:bg-accent/40 cursor-pointer text-left select-all font-mono text-xs space-y-1"
                      dir="ltr"
                      title="انقر مرتين لاسترجاع المعادلة"
                    >
                      <div className="text-muted-foreground truncate">{item.expression}</div>
                      <div className="text-primary font-bold text-sm text-right mt-1">= {item.result}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB B: Unit Converter */}
        <TabsContent value="converter" className="mt-6 max-w-xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                <span>محول الوحدات العلمية والرياضية</span>
              </CardTitle>
              <CardDescription>قم بالتحويل السريع بين الأوزان والمسافات ودرجات الحرارة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category select */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">تصنيف القياس</label>
                <Select
                  value={convCategory}
                  onChange={e => setConvCategory(e.target.value as any)}
                >
                  {Object.entries(CONVERSION_CATEGORIES).map(([key, item]) => (
                    <option key={key} value={key}>{item.label}</option>
                  ))}
                </Select>
              </div>

              {/* Values grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">القيمة المراد تحويلها</label>
                  <Input
                    type="number"
                    value={convValue}
                    onChange={e => setConvValue(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">النتيجة</label>
                  <Input
                    className="font-bold text-primary font-mono text-sm bg-muted"
                    readOnly
                    value={convResult}
                  />
                </div>
              </div>

              {/* Units selects */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">من وحدة</label>
                  <Select
                    value={convFromUnit}
                    onChange={e => setConvFromUnit(e.target.value)}
                  >
                    {CONVERSION_CATEGORIES[convCategory].units.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">إلى وحدة</label>
                  <Select
                    value={convToUnit}
                    onChange={e => setConvToUnit(e.target.value)}
                  >
                    {CONVERSION_CATEGORIES[convCategory].units.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
