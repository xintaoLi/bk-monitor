/**
 * bk-magic-vue stub
 * 用于兼容从 v2 迁移过来的代码
 * 这些是旧版 bk-magic-vue 组件的类型定义，实际运行时会由真实的库提供
 */

// 消息提示
export const Message = {
  success: (msg: string) => console.log('[Success]', msg),
  error: (msg: string) => console.error('[Error]', msg),
  warning: (msg: string) => console.warn('[Warning]', msg),
  info: (msg: string) => console.info('[Info]', msg),
};

// bkMessage 函数形式（可作为函数调用）
export const bkMessage = Object.assign(
  (options: { theme?: string; message: string; delay?: number; offsetY?: number }) => {
    const { theme = 'info', message } = options;
    console.log(`[Message ${theme}]`, message);
  },
  {
    success: (msg: string) => console.log('[Success]', msg),
    error: (msg: string) => console.error('[Error]', msg),
    warning: (msg: string) => console.warn('[Warning]', msg),
    info: (msg: string) => console.info('[Info]', msg),
  }
);

// 信息框
export const InfoBox = {
  show: (...args: any[]) => {
    console.warn('InfoBox.show 未实现，需要迁移到 bkui-vue');
    return Promise.resolve();
  },
  $el: null,
};

// bkInfoBox 函数形式
export const bkInfoBox = Object.assign(
  (options: any) => {
    console.warn('bkInfoBox 未实现，需要迁移到 bkui-vue', options);
    return Promise.resolve();
  },
  {
    show: (...args: any[]) => {
      console.warn('bkInfoBox.show 未实现，需要迁移到 bkui-vue');
      return Promise.resolve();
    },
    $el: null,
  }
);

// 通知
export const Notify = {
  success: (msg: string) => console.log('[Notify Success]', msg),
  error: (msg: string) => console.error('[Notify Error]', msg),
  warning: (msg: string) => console.warn('[Notify Warning]', msg),
  info: (msg: string) => console.info('[Notify Info]', msg),
};

export const bkNotify = Notify;

// Vue 组件类型（用于类型检查）
type ComponentProps = Record<string, any>;

// 基础组件类型定义
const createStubComponent = (name: string) => ({
  name,
  props: {} as ComponentProps,
});

// 基础组件
export const Button = createStubComponent('bk-button');
export const bkButton = Button;

export const Input = createStubComponent('bk-input');
export const bkInput = Input;

export const Select = createStubComponent('bk-select');
export const bkSelect = Select;

export const Option = createStubComponent('bk-option');
export const bkOption = Option;

export const OptionGroup = createStubComponent('bk-option-group');
export const bkOptionGroup = OptionGroup;

export const Checkbox = createStubComponent('bk-checkbox');
export const bkCheckbox = Checkbox;

export const CheckboxGroup = createStubComponent('bk-checkbox-group');
export const bkCheckboxGroup = CheckboxGroup;

export const Radio = createStubComponent('bk-radio');
export const bkRadio = Radio;

export const RadioButton = createStubComponent('bk-radio-button');
export const bkRadioButton = RadioButton;

export const RadioGroup = createStubComponent('bk-radio-group');
export const bkRadioGroup = RadioGroup;

export const Switcher = createStubComponent('bk-switcher');
export const bkSwitcher = Switcher;

export const DatePicker = createStubComponent('bk-date-picker');
export const bkDatePicker = DatePicker;

export const TimePicker = createStubComponent('bk-time-picker');
export const bkTimePicker = TimePicker;

// 布局组件
export const Container = createStubComponent('bk-container');
export const bkContainer = Container;

export const Row = createStubComponent('bk-row');
export const bkRow = Row;

export const Col = createStubComponent('bk-col');
export const bkCol = Col;

// 表单组件
export const Form = createStubComponent('bk-form');
export const bkForm = Form;

export const FormItem = createStubComponent('bk-form-item');
export const bkFormItem = FormItem;

export const ComposeFormItem = createStubComponent('bk-compose-form-item');
export const bkComposeFormItem = ComposeFormItem;

// 数据展示组件
export const Table = createStubComponent('bk-table');
export const bkTable = Table;

export const TableColumn = createStubComponent('bk-table-column');
export const bkTableColumn = TableColumn;

export const TableSettingContent = createStubComponent('bk-table-setting-content');
export const bkTableSettingContent = TableSettingContent;

export const Pagination = createStubComponent('bk-pagination');
export const bkPagination = Pagination;

export const Tag = createStubComponent('bk-tag');
export const bkTag = Tag;

export const TagInput = createStubComponent('bk-tag-input');
export const bkTagInput = TagInput;

export const Badge = createStubComponent('bk-badge');
export const bkBadge = Badge;

export const Progress = createStubComponent('bk-progress');
export const bkProgress = Progress;

export const RoundProgress = createStubComponent('bk-round-progress');
export const bkRoundProgress = RoundProgress;

export const Tree = createStubComponent('bk-tree');
export const bkTree = Tree;

export const BigTree = createStubComponent('bk-big-tree');
export const bkBigTree = BigTree;

export const Timeline = createStubComponent('bk-timeline');
export const bkTimeline = Timeline;

export const Steps = createStubComponent('bk-steps');
export const bkSteps = Steps;

// 导航组件
export const Tab = createStubComponent('bk-tab');
export const bkTab = Tab;

export const TabPanel = createStubComponent('bk-tab-panel');
export const bkTabPanel = TabPanel;

export const Navigation = createStubComponent('bk-navigation');
export const bkNavigation = Navigation;

export const NavigationMenu = createStubComponent('bk-navigation-menu');
export const bkNavigationMenu = NavigationMenu;

export const NavigationMenuGroup = createStubComponent('bk-navigation-menu-group');
export const bkNavigationMenuGroup = NavigationMenuGroup;

export const NavigationMenuItem = createStubComponent('bk-navigation-menu-item');
export const bkNavigationMenuItem = NavigationMenuItem;

export const Breadcrumb = createStubComponent('bk-breadcrumb');
export const bkBreadcrumb = Breadcrumb;

export const BreadcrumbItem = createStubComponent('bk-breadcrumb-item');
export const bkBreadcrumbItem = BreadcrumbItem;

export const DropdownMenu = createStubComponent('bk-dropdown-menu');
export const bkDropdownMenu = DropdownMenu;

// 反馈组件
export const Dialog = createStubComponent('bk-dialog');
export const bkDialog = Dialog;

export const Popover = createStubComponent('bk-popover');
export const bkPopover = Popover;

export const Popconfirm = createStubComponent('bk-popconfirm');
export const bkPopconfirm = Popconfirm;

export const Sideslider = createStubComponent('bk-sideslider');
export const bkSideslider = Sideslider;

export const Alert = createStubComponent('bk-alert');
export const bkAlert = Alert;

export const Collapse = createStubComponent('bk-collapse');
export const bkCollapse = Collapse;

export const CollapseItem = createStubComponent('bk-collapse-item');
export const bkCollapseItem = CollapseItem;

// 其他组件
export const Loading = createStubComponent('bk-loading');

export const Spin = createStubComponent('bk-spin');
export const bkSpin = Spin;

export const Icon = createStubComponent('bk-icon');
export const bkIcon = Icon;

export const Link = createStubComponent('bk-link');
export const bkLink = Link;

export const Image = createStubComponent('bk-image');
export const bkImage = Image;

export const ImageViewer = createStubComponent('bk-image-viewer');
export const bkImageViewer = ImageViewer;

export const ZoomImage = createStubComponent('bk-zoom-image');
export const bkZoomImage = ZoomImage;

export const Upload = createStubComponent('bk-upload');
export const bkUpload = Upload;

export const Divider = createStubComponent('bk-divider');
export const bkDivider = Divider;

export const Card = createStubComponent('bk-card');
export const bkCard = Card;

export const Cascade = createStubComponent('bk-cascade');
export const bkCascade = Cascade;

export const ColorPicker = createStubComponent('bk-color-picker');
export const bkColorPicker = ColorPicker;

export const Transfer = createStubComponent('bk-transfer');
export const bkTransfer = Transfer;

export const Slider = createStubComponent('bk-slider');
export const bkSlider = Slider;

export const Rate = createStubComponent('bk-rate');
export const bkRate = Rate;

export const Star = createStubComponent('bk-star');
export const bkStar = Star;

export const AnimateNumber = createStubComponent('bk-animate-number');
export const bkAnimateNumber = AnimateNumber;

export const VirtualScroll = createStubComponent('bk-virtual-scroll');
export const bkVirtualScroll = VirtualScroll;

export const VirtualRender = createStubComponent('bk-virtual-render');
export const bkVirtualRender = VirtualRender;

export const Exception = createStubComponent('bk-exception');
export const bkException = Exception;

export const SearchSelect = createStubComponent('bk-search-select');
export const bkSearchSelect = SearchSelect;

export const Process = createStubComponent('bk-process');
export const bkProcess = Process;

export const Swiper = createStubComponent('bk-swiper');
export const bkSwiper = Swiper;

export const Diff = createStubComponent('bk-diff');
export const bkDiff = Diff;

export const VersionDetail = createStubComponent('bk-version-detail');
export const bkVersionDetail = VersionDetail;

export const ResizeLayout = createStubComponent('bk-resize-layout');
export const bkResizeLayout = ResizeLayout;

export const FixedNavbar = createStubComponent('bk-fixed-navbar');
export const bkFixedNavbar = FixedNavbar;

export const BackTop = createStubComponent('bk-back-top');
export const bkBackTop = BackTop;

export const Affix = createStubComponent('bk-affix');
export const bkAffix = Affix;

export const Transition = createStubComponent('bk-transition');
export const bkTransition = Transition;

export default {
  Message,
  bkMessage,
  InfoBox,
  bkInfoBox,
  Notify,
  bkNotify,
  Button,
  bkButton,
  Input,
  bkInput,
  Select,
  bkSelect,
  Option,
  bkOption,
  OptionGroup,
  bkOptionGroup,
  Checkbox,
  bkCheckbox,
  CheckboxGroup,
  bkCheckboxGroup,
  Radio,
  bkRadio,
  RadioButton,
  bkRadioButton,
  RadioGroup,
  bkRadioGroup,
  Switcher,
  bkSwitcher,
  DatePicker,
  bkDatePicker,
  TimePicker,
  bkTimePicker,
  Container,
  bkContainer,
  Row,
  bkRow,
  Col,
  bkCol,
  Form,
  bkForm,
  FormItem,
  bkFormItem,
  ComposeFormItem,
  bkComposeFormItem,
  Table,
  bkTable,
  TableColumn,
  bkTableColumn,
  TableSettingContent,
  bkTableSettingContent,
  Pagination,
  bkPagination,
  Tag,
  bkTag,
  TagInput,
  bkTagInput,
  Badge,
  bkBadge,
  Progress,
  bkProgress,
  RoundProgress,
  bkRoundProgress,
  Tree,
  bkTree,
  BigTree,
  bkBigTree,
  Timeline,
  bkTimeline,
  Steps,
  bkSteps,
  Tab,
  bkTab,
  TabPanel,
  bkTabPanel,
  Navigation,
  bkNavigation,
  NavigationMenu,
  bkNavigationMenu,
  NavigationMenuGroup,
  bkNavigationMenuGroup,
  NavigationMenuItem,
  bkNavigationMenuItem,
  Breadcrumb,
  bkBreadcrumb,
  BreadcrumbItem,
  bkBreadcrumbItem,
  DropdownMenu,
  bkDropdownMenu,
  Dialog,
  bkDialog,
  Popover,
  bkPopover,
  Popconfirm,
  bkPopconfirm,
  Sideslider,
  bkSideslider,
  Alert,
  bkAlert,
  Collapse,
  bkCollapse,
  CollapseItem,
  bkCollapseItem,
  Loading,
  Spin,
  bkSpin,
  Icon,
  bkIcon,
  Link,
  bkLink,
  Image,
  bkImage,
  ImageViewer,
  bkImageViewer,
  ZoomImage,
  bkZoomImage,
  Upload,
  bkUpload,
  Divider,
  bkDivider,
  Card,
  bkCard,
  Cascade,
  bkCascade,
  ColorPicker,
  bkColorPicker,
  Transfer,
  bkTransfer,
  Slider,
  bkSlider,
  Rate,
  bkRate,
  Star,
  bkStar,
  AnimateNumber,
  bkAnimateNumber,
  VirtualScroll,
  bkVirtualScroll,
  VirtualRender,
  bkVirtualRender,
  Exception,
  bkException,
  SearchSelect,
  bkSearchSelect,
  Process,
  bkProcess,
  Swiper,
  bkSwiper,
  Diff,
  bkDiff,
  VersionDetail,
  bkVersionDetail,
  ResizeLayout,
  bkResizeLayout,
  FixedNavbar,
  bkFixedNavbar,
  BackTop,
  bkBackTop,
  Affix,
  bkAffix,
  Transition,
  bkTransition,
};
